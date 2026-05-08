# DormManager

Ung dung quan ly ky tuc xa dung HTML, CSS, Bootstrap 5, JavaScript thuan, jQuery va MockAPI.io.

## Cau hinh MockAPI

API hien dang cau hinh trong `js/api.js`:

```js
const API_BASE_URL = "https://69ead50515c7e2d5126a0f46.mockapi.io/v1";
```

## Chi can tao 2 resources

Vi tai khoan cua ban chi tao duoc 2 resource, hay tao dung 2 resource sau:

```text
rooms
students
```

Khong tao `payments`. Tab thanh toan trong Admin se doc va cap nhat cac field thanh toan nam trong tung ban ghi `students`.

## Resource: rooms

- `createdAt`: date
- `name`: string, vi du `Phong A101`
- `building`: string, vi du `A`
- `floor`: number hoac string, vi du `1`
- `type`: string, vi du `4 nguoi`
- `capacity`: number
- `occupied`: number
- `price`: number
- `amenities`: string, vi du `Wifi, May lanh, Tu do`
- `status`: string, mot trong `available`, `full`, `maintenance`
- `image`: string, co the la URL hoac Base64 data URL tu anh chon tren may
- `description`: string

## Resource: students

- `createdAt`: date
- `fullName`: string
- `studentCode`: string
- `phone`: string
- `email`: string
- `roomId`: string, trung voi `id` cua room
- `checkInDate`: date
- `status`: string, mot trong `active`, `inactive`
- `paymentAmount`: number
- `paymentMonth`: string, vi du `2026-05`
- `paymentStatus`: string, mot trong `paid`, `unpaid`, `overdue`
- `paidAt`: date
- `paymentNote`: string

## Chay thu

Mo truc tiep `index.html` hoac `admin.html` trong trinh duyet. Sau khi tao MockAPI dung ten resource va field o tren, trang Public va Admin se lay du lieu tu API.
