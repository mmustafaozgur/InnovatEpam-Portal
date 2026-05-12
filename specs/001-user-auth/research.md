# Research: User Authentication System

**Feature**: `001-user-auth` | **Date**: 2026-05-12 | **Status**: Complete — no NEEDS CLARIFICATION items remain

All architecture decisions were settled during `/speckit-clarify` and captured in ADR-006.
This document records library-level choices and implementation patterns resolved during Phase 0.

---

## R-001: Python JWT Library

**Decision**: `PyJWT >= 2.8.0`

**Rationale**: PyJWT is actively maintained, has a simple API, and integrates cleanly with
FastAPI dependency injection. `python-jose` is a legacy JOSE-spec library with a broader
scope; its JWT focus is secondary and maintenance has slowed.

**Alternatives Considered**:
- `python-jose[cryptography]`: Previously the FastAPI docs default; now superseded by PyJWT
  for new projects. Rejected because PyJWT is more actively maintained in 2025.

**Gotcha**: Validate the `exp` claim explicitly; never disable expiry checking in production.

---

## R-002: Password Hashing Library

**Decision**: `passlib[bcrypt]`

**Rationale**: FastAPI's official documentation recommends passlib; bcrypt is proven and
battle-tested for password storage. The overhead of argon2 is not justified for an
internal tool.

**Alternatives Considered**:
- `argon2-cffi`: Theoretically stronger memory-hard algorithm but adds C extension complexity
  and is slower than bcrypt for the expected login volume of an internal portal. Rejected
  per Principle V (Simplicity).

**Gotcha**: Use `CryptContext(schemes=["bcrypt"], deprecated="auto")`; never hash a password
that is already hashed (e.g., double-hash in a service pipeline).

---

## R-003: FastAPI Cookie Auth Pattern

**Decision**: Custom FastAPI dependency that reads `Request.cookies[COOKIE_NAME]`

**Rationale**: `OAuth2PasswordBearer` is designed for `Authorization: Bearer` headers, not
cookies. A custom `Depends(get_current_user)` function that reads the httpOnly cookie,
decodes the JWT, validates the session row, and returns the user model is explicit,
testable, and does not misuse a header-oriented utility.

**Implementation sketch**:
```python
async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401)
    payload = decode_jwt(token)                        # raises 401 on invalid/expired
    session = await db.get(Session, payload["session_id"])
    if not session or session.expiry_time < datetime.utcnow():
        if session:
            await db.delete(session)                   # lazy expiry cleanup (ADR-006 D5)
            await db.commit()
        raise HTTPException(status_code=401)
    return await db.get(User, payload["sub"])
```

**Gotcha**: Set `SameSite=Lax` (not Strict) to allow navigation from external links to
succeed without re-login; `SameSite=Strict` blocks cookie on top-level GET navigations
from external referrers.

---

## R-004: Atomic First-User-Is-Admin in SQLite

**Decision**: Application-level count check inside an explicit `BEGIN IMMEDIATE` transaction

**Rationale**: SQLite WAL mode serializes writers; `BEGIN IMMEDIATE` acquires the write lock
before counting rows, ensuring no second concurrent writer can race past the count check.
DB-level triggers for this pattern add schema complexity without additional safety benefit.

**Implementation sketch**:
```python
async with db.begin():
    # BEGIN IMMEDIATE is the correct isolation level for SQLite
    count = await db.scalar(select(func.count()).select_from(User))
    role = Role.admin if count == 0 else Role.submitter
    user = User(role=role, ...)
    db.add(user)
# COMMIT happens on context manager exit
```

**Gotcha**: With async SQLAlchemy + aiosqlite, ensure the session is configured with
`isolation_level=None` (autocommit off) and that the transaction context is used correctly.
Using the ORM `async with session.begin()` is the safest approach.

---

## R-005: React Router v6 Protected Route Pattern

**Decision**: Layout route with `<Outlet>`-based guard component

**Rationale**: React Router v6's layout route pattern centralises auth checking in one
wrapper component. All protected routes are nested under the guard in the router config;
the guard renders `<Outlet>` if authenticated, otherwise `<Navigate to="/login" state={{ from: location }} />`.

**Implementation sketch**:
```tsx
function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

// In router config:
<Route element={<ProtectedRoute />}>
  <Route path="/home" element={<HomePage />} />
  <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
</Route>
```

**Gotcha**: Pass `replace` to `<Navigate>` to avoid a back-button loop; pass `state={{ from: location }}` to enable post-login redirect to the originally requested page (User Story 3).

---

## R-006: Auth State Hydration on SPA Page Refresh

**Decision**: `GET /api/v1/auth/me` called on `AuthProvider` mount

**Rationale**: The JWT is in an httpOnly cookie and is not JS-accessible. On page refresh,
the React app has no auth state. Calling `GET /auth/me` on mount sends the cookie
automatically; the server validates the session and returns `{ id, full_name, email, role }`.
The `AuthProvider` stores this in React Context. A loading state prevents protected route
checks from firing before hydration completes.

**Implementation sketch**:
```tsx
function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>
    {children}
  </AuthContext.Provider>;
}
```

**Gotcha**: The `isLoading` flag is critical — without it, the `ProtectedRoute` will
redirect to login on every page refresh before the `/auth/me` call completes.

---

## R-007: JWT Payload Structure

**Decision**: Embed `sub` (user ID), `role`, `session_id`, `exp`, `iat`

**Rationale**: Including `session_id` in the payload allows the auth middleware to look up
the specific session row by its primary key rather than scanning by `user_id` or `token`
value, making the per-request session validation a single indexed PK lookup.

```json
{
  "sub": "<user-uuid>",
  "role": "admin|submitter",
  "session_id": "<session-uuid>",
  "exp": 1234567890,
  "iat": 1234567890
}
```

**Gotcha**: Role in the JWT payload is trusted for route authorization (ADR-006 D3) and is
not re-fetched from the DB on each request. After promotion, the user must re-login to get a
JWT with the updated role claim.
