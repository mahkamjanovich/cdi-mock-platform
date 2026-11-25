import { lazy, Suspense } from 'react'
import StudentApp from './student/StudentApp.jsx'
import { Loading } from './ui.jsx'

// Admin kodi o'quvchilarga yuklanmaydi (telefonda sahifa tezroq ochiladi)
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

export default function App() {
  const path = window.location.pathname
  // /admin va /teacher — bitta xodimlar paneli; ko'rinadigan bo'limlar hisob roliga qarab belgilanadi
  if (path.startsWith('/admin') || path.startsWith('/teacher')) {
    return <Suspense fallback={<Loading />}><AdminApp /></Suspense>
  }
  return <StudentApp />
}
