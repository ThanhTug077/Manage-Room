# Worktree Plan

Repo nay da duoc tach thanh cac git worktree de co the lam song song ma khong can stash hay checkout qua lai.

## Cau truc hien tai

- `main`
  - Duong dan: `D:\qly ktx\Quản lý ký túc xxas`
  - Vai tro: nhanh tich hop, review, test nhanh, merge cac nhanh tinh nang.

- `feature-public-ui`
  - Duong dan: `D:\qly ktx\Quản lý ký túc xxas\.worktrees\public-ui`
  - Pham vi chinh: `index.html`, `css/style.css`, `js/main.js`
  - Muc dich: giao dien trang public, bo loc phong, modal chi tiet, luong dang ky.

- `feature-admin-ui`
  - Duong dan: `D:\qly ktx\Quản lý ký túc xxas\.worktrees\admin-ui`
  - Pham vi chinh: `admin.html`, `admin.css`, `js/admin.js`
  - Muc dich: dashboard admin, CRUD phong/sinh vien/thanh toan, login admin.

- `feature-shared-api`
  - Duong dan: `D:\qly ktx\Quản lý ký túc xxas\.worktrees\shared-api`
  - Pham vi chinh: `js/api.js`, `js/utils.js`, `README.md`
  - Muc dich: lop API dung chung, helper format/validate, tai lieu ky thuat.

- `feature-assets-content`
  - Duong dan: `D:\qly ktx\Quản lý ký túc xxas\.worktrees\assets-content`
  - Pham vi chinh: `img/`, noi dung tinh, hinh anh, thong diep giao dien dung chung.
  - Muc dich: cap nhat tai nguyen media va noi dung ma it can cham vao logic.

## Nguyen tac lam viec

1. Lam viec tren dung worktree theo pham vi de giam conflict.
2. Neu sua file dung chung nhu `js/utils.js`, uu tien worktree `feature-shared-api`.
3. Merge tung nhanh ve `main` theo thu tu:
   - `feature-shared-api`
   - `feature-public-ui`
   - `feature-admin-ui`
   - `feature-assets-content`
4. Neu mot task can sua ca public va admin, tach thanh hai commit rieng neu co the.

## Lenh thao tac nhanh

```powershell
git worktree list
git -C "D:\qly ktx\Quản lý ký túc xxas\.worktrees\public-ui" status
git -C "D:\qly ktx\Quản lý ký túc xxas\.worktrees\admin-ui" status
git -C "D:\qly ktx\Quản lý ký túc xxas\.worktrees\shared-api" status
git -C "D:\qly ktx\Quản lý ký túc xxas\.worktrees\assets-content" status
```

## Khi khong dung nua

Neu can xoa worktree sau khi da merge:

```powershell
git worktree remove ".worktrees\public-ui"
git branch -d feature-public-ui
```

Ap dung tuong tu cho cac worktree con lai.
