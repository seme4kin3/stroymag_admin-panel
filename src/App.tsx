import { BrowserRouter, Routes, Route, NavLink, Navigate, Outlet } from 'react-router-dom';
import UnitsPage from './pages/Units/UnitsPage';
import BrandsPage from './pages/Brands/BrandsPage';
import AttributesPage from './pages/Attributes/AttributesPage';
import CategoriesPage from './pages/Categories/CategoriesPage';
import ProductsPage from './pages/Products/ProductsPage';

function AdminLayout() {
  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="sidebar-title">Админка</h2>
        <nav className="sidebar-menu">
          <NavLink
            to="units"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Единицы измерения
          </NavLink>
          <NavLink
            to="brands"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Бренды
          </NavLink>
          <NavLink
            to="attributes"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Атрибуты
          </NavLink>
          <NavLink
            to="categories"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Категории
          </NavLink>
          <NavLink
            to="products"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Товары
          </NavLink>
        </nav>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          {/* при заходе на / переходим на /units */}
          <Route index element={<Navigate to="units" replace />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="attributes" element={<AttributesPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="products" element={<ProductsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
