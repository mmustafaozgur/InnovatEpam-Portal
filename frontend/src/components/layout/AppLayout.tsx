import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-[220px] min-h-screen bg-background">
        <Outlet />
      </div>
    </div>
  )
}
