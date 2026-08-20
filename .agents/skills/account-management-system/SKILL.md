---
name: account-management-system
description: >-
  Use this skill as a runbook and reference architecture when modifying, 
  debugging, or extending the Account Management (Quản trị hệ thống) screen, 
  user roles, and the Level 1 -> Level 2 hierarchy system in the project.
---

# Hệ Thống Quản Trị Tài Khoản & Phân Cấp (Account Management System)

This skill documents the architecture, logic, and UI layout patterns of the Account Management System, specifically for the `super_admin` role managing `level_1` (Khách hàng) and `level_2` (Thành viên Cấp 2) accounts.

## 1. Business Logic & Data Structure

### Roles & Hierarchy
- **`super_admin`**: Quản trị viên cao nhất. Không thấy dữ liệu dự án/hợp đồng của khách hàng. Chỉ nhìn thấy màn hình "Quản trị hệ thống".
- **`level_1`**: Tài khoản Khách hàng (Đơn vị/Công ty). Quản lý dự án, hợp đồng và thanh toán của riêng họ.
- **`level_2`**: Thành viên thuộc về một tài khoản `level_1`. Được gán `parent_id` trỏ đến ID của `level_1`.

### Data Relationships
- Mọi thành viên `level_2` phải có `parent_id` tham chiếu đến `level_1`.
- Quota (Hạn mức): Mỗi `level_1` có `max_quota` giới hạn số lượng `level_2` có thể tạo.
- Row Data (Table): Hiển thị hạn mức dưới dạng `subCount / max_quota`.
- Statuses: `active` (Hoạt động), `pending` (Chờ duyệt), `blocked` (Đã khóa), `archived` (Đã xóa).

## 2. UI/UX Principles: Information Density & Viewport Constraint

The system strictly follows an **Information Dense**, **Compact**, and **Scroll-constrained** UI architecture.

### Global Constraints
- **Không bao giờ Scroll toàn bộ trang (Page-level scrolling is locked).**
- Bố cục sử dụng Flexbox (e.g., `flex flex-col h-[calc(100vh-100px)]`).
- `Header`, `KPIs`, `Toolbar` và `Footer/Action` sử dụng `shrink-0` (cố định).
- **Chỉ có khu vực danh sách (Table)** được phép scroll với `flex-1 min-h-0 overflow-y-auto`.
- Tiêu đề cột của Table (`thead`) luôn dùng `sticky top-0 z-10`.

### Main Dashboard (`AdminDashboard.jsx`)
- **Compact KPI**: Các card KPI (Tổng, Hoạt động, Chờ, Khóa) nằm trên một hàng nhỏ bên cạnh/dưới Header thay vì dùng Card siêu to.
- **Table Density**: 
  - Padding nhỏ (`py-2`).
  - Avatar nhỏ (`w-7 h-7`).
  - Font size bé hơn (`text-[13px]`, `text-[11px]` cho email).
  - Không dàn hàng ngang các nút Action (Duyệt/Khóa/Xóa) mà gom gọn vào dropdown `⋮` (MoreVertical).

### Detail Modal / Drawer
- **Position**: Căn giữa theo chiều ngang, sát mép trên (`pt-6`). KHÔNG căn giữa màn hình theo chiều dọc.
- **Height Limit**: `max-h-[calc(100vh-48px)]` cho desktop, `max-h-[100dvh]` cho mobile.
- **Background Lock**: Background bị khóa cuộn khi mở modal (`document.body.style.overflow = 'hidden'`).
- **Layout Flow**:
  1. Sticky Header (`shrink-0`): Chứa Tên, Avatar, Badge Trạng thái, Badge Loại tài khoản, Nút Action (Lock/Unlock) và Nút Đóng `X`.
  2. Modal Body (`flex-1 min-h-0 flex flex-col`):
     - **Info & KPI Grid (`shrink-0`)**: Gồm thẻ KPI compact (Hạn mức, Hoạt động) và Grid 2 cột/4 cột thông tin tài khoản. LUÔN LUÔN FIXED ở phía trên nội dung Body.
     - **Member List Table (`flex-1 min-h-0 flex flex-col`)**: Khu vực duy nhất cuộn được. Bảng chứa danh sách Cấp 2 có thanh Search đính kèm.

## 3. Best Practices when Modifying

- **Bảo toàn RLS & Auth**: Mọi query phải thông qua service layer hiện tại. Không chọc thẳng vào Supabase bypass RLS.
- **Không Fake Data**: Chỉ hiển thị thông tin nào thực sự tồn tại trong DB. Nếu thiếu trường (vd: chức danh, avatar URL), hãy dùng Avatar chữ cái và bỏ qua cột đó.
- **Event Propagation**: Table Row có thể click (`onClick`). Các nút nằm trong Row (Dropdown, Toggle) **phải gọi `e.stopPropagation()`** để không kích hoạt click Row.
- **Dropdown Visibility**: Sử dụng kết hợp opacity group hover để giấu nút `⋮` khi không hover, giúp bảng bớt rối. Dropdown menu cần có `z-20` và `absolute`.

## 4. Referencing Example Files

- Giao diện Admin Dashboard hoàn chỉnh nằm ở: `src/components/admin/AdminDashboard.jsx`
- Logic truy vấn / cập nhật nằm ở: `src/services/storage.js` (`fetchAllProfiles`, `updateProfileStatus`)
