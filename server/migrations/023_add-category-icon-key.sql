-- Up Migration

-- Icon danh mục cho giao diện Dark Fantasy (docs/06-ui-ux/components.md Q2):
-- 9 icon nét mảnh vẽ sẵn ở client (components/fx/SvgDefs). NULL = icon sách mặc định.
ALTER TABLE categories
  ADD COLUMN icon_key VARCHAR(30)
    CHECK (icon_key IN ('ky-nang', 'tam-ly', 'van-hoc', 'thieu-nhi', 'ngon-tinh',
                        'on-thi', 'fantasy', 'manga', 'gia-dinh'));

-- Down Migration
ALTER TABLE categories DROP COLUMN IF EXISTS icon_key;
