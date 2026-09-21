# VBDH import pipeline

Pipeline này chuẩn hóa hai file xuất từ VBDH thành schema V2.1.

## Input

- Excel export danh sách nhiệm vụ.
- Word **Báo cáo chi tiết tình trạng xử lý công việc tại đơn vị**.
- Ngày snapshot, ví dụ `21/09/2026`.

## Chạy

```bash
python v2/tools/import_vbdh.py \
  --excel "/path/to/van-ban.xlsx" \
  --word "/path/to/ChiTietXuLyVanBan.docx" \
  --snapshot "21/09/2026" \
  --out "/path/to/private-output"
```

Phụ thuộc:

```bash
pip install openpyxl python-docx
```

## Rule dữ liệu

- Khóa nối: `source_id` = Số phiếu giao việc / Số nhiệm vụ.
- Excel có trùng `source_id`: giữ raw bên ngoài pipeline nếu cần lịch sử, còn master lấy bản có **Ngày tạo mới nhất**.
- `01/01/1970` được coi là **NULL / chưa có hạn**.
- Trạng thái `Hoàn thành / Chưa hoàn thành` lấy từ Word, không suy từ deadline.
- `Quá hạn / Sắp đến hạn / Chưa đến hạn / Chưa có hạn` là lớp quản trị tính theo snapshot.
- Record chỉ có trong Excel và không có trạng thái Word **không được tính KPI trạng thái**.
- Tên nhiệm vụ trong master ưu tiên Word vì Excel có thể cắt nội dung bằng dấu ba chấm.

## Security

Repository hiện là public. **Không commit** các file output sinh từ dữ liệu VBDH thật vào `v2/data/` hoặc bất kỳ đường dẫn public nào. Bản web public chỉ dùng dữ liệu demo/sanitized.
