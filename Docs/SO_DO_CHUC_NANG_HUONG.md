# TÀI LIỆU PHÂN CHIA CHỨC NĂNG & SƠ ĐỒ HOẠT ĐỘNG, SƠ ĐỒ TUẦN TỰ (PHỤ TRÁCH: HƯƠNG)

> **Dự án:** BookStore  
> **Người phụ trách:** Hương  
> **Căn cứ phân công:** File `time-line.md` & Danh sách 20 chức năng ghi chú của dự án.  
> **Nguyên tắc kỹ thuật:** Bám sát 100% mã nguồn thực tế tại dự án gốc `BookStore` (Kiến trúc 3 lớp: Router → Controller → Service → Repository → Database PostgreSQL, tích hợp React Query, Zod validation, Transaction & Row-level Locking).

---

## PHẦN 1: BẢNG ĐỐI CHIẾU 20 MỤC GHI CHÚ VỚI PHÂN CÔNG CỦA HƯƠNG

Theo danh sách 20 mục trong bản ghi chú yêu cầu và bảng phân công tại `time-line.md`, toàn bộ dự án gồm 16 Module chia đều cho 2 thành viên (**Bình phụ trách 8 module** thiên về luồng mua hàng của khách; **Hương phụ trách 8 module** thiên về quản trị Admin và các tính năng tương tác chuyên sâu của người dùng).

| STT Ghi chú | Tên chức năng trong ghi chú | Phụ trách | Module tương ứng trong code | Vai trò & Phạm vi nghiệp vụ của Hương |
|:---:|---|:---:|:---:|---|
| **1** | Đăng ký tài khoản | Bình | Module 01 (Auth - F01) | *Bình phụ trách (Đăng ký OTP email, mật khẩu)* |
| **2** | Đăng nhập / Đăng xuất | Bình | Module 01 (Auth - F02) | *Bình phụ trách (JWT Refresh/Access token)* |
| **3** | **Quản lý thông tin cá nhân** | **HƯƠNG** | **Module 04 (User Profile - F08)** | Cập nhật hồ sơ (tên, sđt, avatar), đổi mật khẩu (thu hồi session), quản lý phiên đăng nhập/thiết bị, tổng quan tài khoản. |
| **4** | **Quản lý địa chỉ giao hàng** | **HƯƠNG** | **Module 04 (User Profile - F09)** | Sổ địa chỉ giao hàng: CRUD địa chỉ, quy định tối đa 10 địa chỉ/tài khoản, cơ chế khoá transaction và tự động duy trì duy nhất 1 địa chỉ mặc định. |
| **5** | Tìm kiếm sách | Bình | Module 03 (Catalog - F07) | *Bình phụ trách (Tìm kiếm full-text search, filter)* |
| **6** | **Danh mục & phân loại sách** | **HƯƠNG** & Bình | **Module 02 (Admin - F03)** & M03 | **Hương quản trị (Admin):** CRUD cây danh mục cha-con, tác giả, nhà xuất bản, thứ tự hiển thị.<br>*(Bình làm phần hiển thị phía khách hàng ở M03)*. |
| **7** | Xem danh sách sản phẩm | Bình | Module 03 (Catalog - F05) | *Bình phụ trách (Trang danh sách sách, phân trang)* |
| **8** | Xem chi tiết sách | Bình | Module 03 (Catalog - F06) | *Bình phụ trách (Trang chi tiết sách, thông tin bìa, giá)* |
| **9** | Giỏ hàng | Bình | Module 05 (Cart - F10) | *Bình phụ trách (Thêm, bớt, cập nhật số lượng)* |
| **10** | Đặt hàng / Checkout | Bình | Module 06 (Order - F11) | *Bình phụ trách (Tạo đơn hàng, giữ tồn kho)* |
| **11** | Thanh toán (COD, online) | Bình | Module 07 (Payment - F12) | *Bình phụ trách (Cổng thanh toán VNPay, COD)* |
| **12** | **Wishlist / Sách yêu thích** | **HƯƠNG** | **Module 09 (Wishlist - F14)** | Thêm/xóa sách yêu thích, kiểm tra trạng thái yêu thích, giới hạn danh sách tối đa 100 cuốn (`WISHLIST_MAX_ITEMS`), khoá user tránh race condition. |
| **13** | **Đánh giá & bình luận sách** | **HƯƠNG** | **Module 10 (Review - F15)** | Đánh giá 1-5 sao kèm bình luận; điều kiện chỉ được đánh giá sách đã mua và đơn có trạng thái `DELIVERED`; chỉnh sửa trong 30 ngày; cập nhật tự động điểm trung bình sách (`refreshBookRating`); Admin kiểm duyệt/ẩn đánh giá. |
| **14** | Mã giảm giá / Voucher | Bình | Module 11 (Voucher - F16) | *Bình phụ trách (Áp mã voucher, tính chiết khấu)* |
| **15** | **Khuyến mãi / Flash Sale** | **HƯƠNG** | **Module 12 (Flash Sale - F17)** | Quản lý khung giờ vàng: Admin tạo đợt Flash Sale (chống trùng lặp thời gian `assertNoOverlap`), gán sách + giá sale + giới hạn mỗi người (`perUserLimit`); Khách hàng xem đếm ngược thời gian và tỷ lệ bán. |
| **16** | Thông báo cho khách hàng | Bình | Module 13 (Notification - F18) | *Bình phụ trách (Hệ thống chuông, email thông báo)* |
| **17** | **Quản lý sách & tồn kho (Admin)** | **HƯƠNG** | **Module 02 (Admin Books & Inventory - F03)** | Quản lý danh mục sách, thêm/sửa sách, upload ảnh bìa; Quản lý kho: Nhập hàng (`IMPORT`), Điều chỉnh kiểm kê (`ADJUST`), ghi log biến động kho (`inventory_logs`), cảnh báo tồn kho thấp. |
| **18** | **Quản lý khách hàng & đơn hàng (Admin)** | **HƯƠNG** | **Module 08 (Admin Customer & Order - F13)** | Quản lý khách hàng (xem chi tiết chi tiêu, khoá/mở tài khoản, huỷ phiên tức thì); Quản lý đơn hàng (duyệt trạng thái `PENDING → CONFIRMED → SHIPPING → COMPLETED`, huỷ đơn `adminCancel` kèm hoàn tồn kho tự động và hoàn lượt voucher). |
| **19** | **Dashboard & báo cáo doanh thu (Admin)** | **HƯƠNG** | **Module 14 (Admin Dashboard & Reports - F19)** | Thống kê số liệu kinh doanh: KPI Cards (Doanh thu, Đơn hàng, Khách hàng, Sách bán), biểu đồ doanh thu theo thời gian, tỷ lệ đơn hàng, top 10 sách bán chạy; Xuất báo cáo đơn hàng định dạng CSV (UTF-8 BOM). |
| **20** | **AI gợi ý sách theo sở thích** *(ghi chú: "AI nhưng chưa rõ ràng")* | **HƯƠNG** | **Module 15 (AI Recommendations - Groq - F20)** | Hệ thống gợi ý sách cá nhân hoá: Form thiết lập sở thích đọc sách (`preferences`), popup Onboarding chào mừng, kết nối Groq Cloud API (mô hình LLaMA 3.3 70B), cache kết quả gợi ý vào DB, rate limit nút làm mới gợi ý.<br>*(Lưu ý: Chức năng Chatbox AI tư vấn bán hàng M16 do Bình phụ trách)*. |

---

## PHẦN 2: CHI TIẾT SƠ ĐỒ HOẠT ĐỘNG (ACTIVITY) & SƠ ĐỒ TUẦN TỰ (SEQUENCE) CHO TỪNG CHỨC NĂNG

---

### CHỨC NĂNG 1: QUẢN LÝ THÔNG TIN CÁ NHÂN & SỔ ĐỊA CHỈ (MODULE 04 - F08, F09)
*Tương ứng mục 3 & 4 trong ghi chú.*

#### 1.1. Sơ đồ Hoạt động (Activity Diagram) – Quản lý Hồ sơ & Sổ địa chỉ
```mermaid
flowchart TD
    Start(["Bắt đầu: Người dùng vào trang Tài khoản (/tai-khoan)"]) --> AuthCheck{"Đã đăng nhập (Có JWT Token)?"}
    AuthCheck -- "Không" --> RedirectLogin["Chuyển hướng đến /dang-nhap"]
    AuthCheck -- "Có" --> ChooseAction{"Chọn chức năng thực hiện"}

    %% Luồng Hồ sơ cá nhân
    ChooseAction -- "Cập nhật Hồ sơ" --> InputProfile["Nhập Họ tên, Số điện thoại"]
    InputProfile --> ValidateProfile{"Dữ liệu hợp lệ (Regex SĐT VN, độ dài tên)?"}
    ValidateProfile -- "Sai" --> ShowErrorProfile["Báo lỗi form (422)"]
    ValidateProfile -- "Đúng" --> PatchProfile["Gọi PATCH /api/me"]
    PatchProfile --> DBUpdateProfile[("DB: Cập nhật bảng users")]
    DBUpdateProfile --> SuccessProfile["Thông báo cập nhật hồ sơ thành công"]

    %% Luồng Đổi mật khẩu
    ChooseAction -- "Đổi mật khẩu" --> InputPass["Nhập mật khẩu cũ & mật khẩu mới"]
    InputPass --> CheckPassLength{"Mật khẩu mới đủ 6 ký tự & khác mật khẩu cũ?"}
    CheckPassLength -- "Không" --> ShowErrorPass["Báo lỗi nhập liệu"]
    CheckPassLength -- "Hợp lệ" --> PostChangePass["Gọi POST /api/me/change-password"]
    PostChangePass --> VerifyOldPass{"Mật khẩu cũ khớp bcrypt hash?"}
    VerifyOldPass -- "Không khớp" --> Throw400Pass["Báo lỗi: Mật khẩu cũ không chính xác (400)"]
    VerifyOldPass -- "Khớp" --> SaveNewPass[("DB: Cập nhật password_hash")]
    SaveNewPass --> RevokeSessions[("DB: Thu hồi tất cả refresh_tokens khác")]
    RevokeSessions --> SuccessPass["Thông báo đổi mật khẩu thành công & giữ lại phiên hiện tại"]

    %% Luồng Quản lý địa chỉ
    ChooseAction -- "Thêm địa chỉ giao hàng mới" --> InputAddress["Nhập Tên người nhận, SĐT, Tỉnh/Thành, Quận/Huyện, Phường/Xã, Địa chỉ cụ thể, chọn Mặc định"]
    InputAddress --> ValidateAddress{"Zod validate hợp lệ?"}
    ValidateAddress -- "Sai" --> ShowErrorAddress["Báo lỗi form (422)"]
    ValidateAddress -- "Đúng" --> PostAddress["Gọi POST /api/me/addresses"]
    PostAddress --> StartTxAddress["Mở DB Transaction & Khoá User (lockUser)"]
    StartTxAddress --> CheckCountAddress{"Số lượng địa chỉ hiện tại < 10?"}
    CheckCountAddress -- "Đã đủ 10 địa chỉ" --> Throw409Address["Báo lỗi ADDRESS_LIMIT (409): Giới hạn tối đa 10 địa chỉ"]
    CheckCountAddress -- "Hợp lệ" --> InsertAddress[("DB: Thêm địa chỉ mới vào user_addresses")]
    InsertAddress --> CheckDefaultAddress{"Là địa chỉ đầu tiên HOẶC tích chọn mặc định?"}
    CheckDefaultAddress -- "Đúng" --> SetDefaultAddress[("DB: Cập nhật is_default = false cho các địa chỉ khác; set is_default = true cho địa chỉ này")]
    CheckDefaultAddress -- "Không" --> CommitAddress["Commit Transaction"]
    SetDefaultAddress --> CommitAddress
    CommitAddress --> SuccessAddress["Trả về địa chỉ mới & render lại danh sách"]

    SuccessProfile --> EndNode(["Kết thúc"])
    SuccessPass --> EndNode
    SuccessAddress --> EndNode
    Throw400Pass --> EndNode
    Throw409Address --> EndNode
```

#### 1.2. Sơ đồ Tuần tự (Sequence Diagram) – Thêm địa chỉ mới có xử lý Transaction & Khóa người dùng
```mermaid
sequenceDiagram
    autonumber
    actor User as Khách hàng
    participant UI as Giao diện Sổ địa chỉ (AddressBook.tsx)
    participant Ctrl as AddressController
    participant Svc as AddressService
    participant Repo as AddressRepository
    participant DB as Database (PostgreSQL)

    User->>UI: Bấm "Thêm địa chỉ mới", nhập thông tin & tích "Đặt làm mặc định"
    UI->>UI: Client validation (Zod schema: họ tên, sđt Việt Nam, địa phương)
    UI->>Ctrl: POST /api/me/addresses (Bearer Token, Body)
    Ctrl->>Ctrl: Middleware validate(addressSchema) & requireRole('CUSTOMER')
    Ctrl->>Svc: addressService.create(userId, input)
    
    rect rgb(240, 248, 255)
        Note over Svc, DB: Bắt đầu Transaction & Khoá hàng (Row Locking)
        Svc->>Repo: withTransaction(async (client))
        Svc->>Repo: lockUser(userId, client)
        Repo->>DB: SELECT id FROM users WHERE id = $1 FOR UPDATE
        DB-->>Repo: User locked
        
        Svc->>Repo: countByUser(userId, client)
        Repo->>DB: SELECT COUNT(*) FROM user_addresses WHERE user_id = $1
        DB-->>Repo: count = 3 (< 10)
        
        Svc->>Repo: insert(userId, { ...fields, isDefault: false }, client)
        Repo->>DB: INSERT INTO user_addresses (...) VALUES (...) RETURNING id
        DB-->>Repo: newId = 15
        
        opt Nếu isDefault = true hoặc count == 0
            Svc->>Repo: setDefault(userId, newId, client)
            Repo->>DB: UPDATE user_addresses SET is_default = (id = 15) WHERE user_id = $1
            DB-->>Repo: Updated
        end
        Svc-->>Ctrl: Hoàn tất transaction (Commit)
    end
    
    Svc->>Repo: findOwned(userId, newId)
    Repo->>DB: SELECT * FROM user_addresses WHERE user_id = $1 AND id = 15
    DB-->>Repo: Address record
    Repo-->>Svc: Address entity
    Svc-->>Ctrl: Address
    Ctrl-->>UI: 201 Created (JSON Address)
    UI-->>User: Đóng modal, hiển thị địa chỉ mới với huy hiệu "Mặc định"
```

---

### CHỨC NĂNG 2: DANH SÁCH SÁCH YÊU THÍCH (WISHLIST) (MODULE 09 - F14)
*Tương ứng mục 12 trong ghi chú.*

#### 2.1. Sơ đồ Hoạt động (Activity Diagram) – Thêm / Xoá sách khỏi Wishlist
```mermaid
flowchart TD
    Start(["Người dùng bấm vào icon Trái tim trên thẻ sách"]) --> AuthCheck{"Đã đăng nhập?"}
    AuthCheck -- "Chưa" --> PromptLogin["Hiển thị thông báo: Vui lòng đăng nhập để lưu sách yêu thích"]
    AuthCheck -- "Đã đăng nhập" --> CheckCurrentState{"Sách đã có trong Wishlist chưa?"}

    %% Luồng xoá
    CheckCurrentState -- "Đã có (Bỏ yêu thích)" --> CallDelete["Gọi DELETE /api/me/wishlist/:bookId"]
    CallDelete --> DBRemove[("DB: DELETE FROM wishlists WHERE user_id = $1 AND book_id = $2")]
    DBRemove --> SuccessRemove["Đổi màu icon trái tim (rỗng) & thông báo đã bỏ lưu"]

    %% Luồng thêm
    CheckCurrentState -- "Chưa có (Thêm mới)" --> CheckBookActive{"Kiểm tra sách có đang kinh doanh (Public)?"}
    CheckBookActive -- "Sách ẩn/ngừng bán" --> Throw404["Báo lỗi 404: Không tìm thấy sách"]
    CheckBookActive -- "Sách hợp lệ" --> CallPost["Gọi POST /api/me/wishlist (bookId)"]
    CallPost --> StartTxWishlist["Mở Transaction & Khoá User (lockUser)"]
    StartTxWishlist --> CheckExistsDB{"Kiểm tra lại DB: Sách đã lưu chưa?"}
    CheckExistsDB -- "Đã lưu (do click đúp)" --> ReturnCount["Bỏ qua insert, trả về count hiện tại"]
    CheckExistsDB -- "Chưa có" --> CheckCapacity{"Số lượng sách trong wishlist < 100 (WISHLIST_MAX_ITEMS)?"}
    CheckCapacity -- "Đã đạt tối đa 100" --> Throw409Wishlist["Báo lỗi WISHLIST_FULL (409): Danh sách yêu thích đã đầy"]
    CheckCapacity -- "Còn chỗ trống" --> InsertWishlist[("DB: INSERT INTO wishlists (user_id, book_id)")]
    InsertWishlist --> CommitTxWishlist["Commit Transaction & đếm lại tổng số lượng"]
    CommitTxWishlist --> SuccessAdd["Đổi màu icon trái tim (đỏ) & hiển thị badge số lượng mới"]

    PromptLogin --> EndNode(["Kết thúc"])
    SuccessRemove --> EndNode
    SuccessAdd --> EndNode
    Throw404 --> EndNode
    Throw409Wishlist --> EndNode
```

#### 2.2. Sơ đồ Tuần tự (Sequence Diagram) – Thêm sách vào Wishlist an toàn chống Race Condition
```mermaid
sequenceDiagram
    autonumber
    actor User as Khách hàng
    participant Card as BookCard (Frontend)
    participant Ctrl as WishlistController
    participant Svc as WishlistService
    participant BookRepo as BookRepository
    participant WishlistRepo as WishlistRepository
    participant DB as Database (PostgreSQL)

    User->>Card: Bấm nút "Yêu thích" trên cuốn sách ID 42
    Card->>Ctrl: POST /api/me/wishlist { bookId: 42 } (Bearer Token)
    Ctrl->>Ctrl: requireAuth & validate({ body: wishlistActionSchema })
    Ctrl->>Svc: wishlistService.addBook(userId, 42)
    
    Svc->>BookRepo: findPublicCategoryId(42)
    BookRepo->>DB: SELECT category_id FROM books WHERE id = 42 AND is_active = true
    DB-->>BookRepo: category_id = 5 (Hợp lệ)
    BookRepo-->>Svc: Found
    
    rect rgb(245, 255, 250)
        Note over Svc, DB: Transaction & Khoá người dùng ngăn chặn spam vượt hạn mức
        Svc->>WishlistRepo: withTransaction(async (client))
        Svc->>WishlistRepo: lockUser(userId, client)
        WishlistRepo->>DB: SELECT id FROM users WHERE id = $1 FOR UPDATE
        DB-->>WishlistRepo: Locked
        
        Svc->>WishlistRepo: exists(userId, 42, client)
        WishlistRepo->>DB: SELECT 1 FROM wishlists WHERE user_id = $1 AND book_id = 42
        DB-->>WishlistRepo: false
        
        Svc->>WishlistRepo: countByUser(userId, client)
        WishlistRepo->>DB: SELECT COUNT(*) FROM wishlists WHERE user_id = $1
        DB-->>WishlistRepo: count = 12 (< 100)
        
        Svc->>WishlistRepo: insert(userId, 42, client)
        WishlistRepo->>DB: INSERT INTO wishlists (user_id, book_id) VALUES ($1, 42)
        DB-->>WishlistRepo: Inserted
        
        Svc->>WishlistRepo: countByUser(userId, client)
        WishlistRepo->>DB: SELECT COUNT(*) FROM wishlists WHERE user_id = $1
        DB-->>WishlistRepo: 13
    end
    
    Svc-->>Ctrl: { count: 13 }
    Ctrl-->>Card: 200 OK { success: true, count: 13 }
    Card-->>User: Icon chuyển thành đã thích, tăng badge giỏ yêu thích
```

---

### CHỨC NĂNG 3: ĐÁNH GIÁ & BÌNH LUẬN SÁCH (MODULE 10 - F15)
*Tương ứng mục 13 trong ghi chú.*

#### 3.1. Sơ đồ Hoạt động (Activity Diagram) – Đánh giá sản phẩm đã mua
```mermaid
flowchart TD
    Start(["Khách hàng vào trang Chi tiết sách hoặc Đơn hàng đã giao"]) --> CheckEligibility{"Kiểm tra điều kiện đánh giá (isReviewable)"}
    CheckEligibility -- "Chưa từng mua hoặc đơn chưa DELIVERED" --> HideButton["Không hiển thị nút Viết đánh giá"]
    CheckEligibility -- "Đã mua & Đơn DELIVERED" --> ClickReview["Bấm 'Viết đánh giá'"]
    
    ClickReview --> CheckExistingReview{"Đã từng đánh giá cuốn sách này trong đơn hàng này chưa?"}
    CheckExistingReview -- "Đã đánh giá & trong 30 ngày" --> ShowEditForm["Mở Form Chỉnh sửa đánh giá hiện tại"]
    CheckExistingReview -- "Đã đánh giá & quá 30 ngày (REVIEW_EDIT_DAYS)" --> BlockEdit["Khoá form: Hết hạn chỉnh sửa đánh giá"]
    CheckExistingReview -- "Chưa từng đánh giá" --> OpenCreateForm["Mở Form Viết đánh giá mới"]

    OpenCreateForm --> InputReview["Chọn số sao (1-5), nhập nội dung bình luận (tối đa 1000 ký tự)"]
    InputReview --> SubmitReview["Gửi yêu cầu POST /api/me/reviews"]
    SubmitReview --> ValidateZod{"Dữ liệu hợp lệ (Rating 1-5, comment không rỗng)?"}
    ValidateZod -- "Lỗi" --> ShowError["Báo lỗi validation (422)"]
    ValidateZod -- "Hợp lệ" --> StartTxReview["Mở DB Transaction"]
    StartTxReview --> CheckReviewableDB{"Kiểm tra DB: Đơn có thuộc user, trạng thái DELIVERED & có bookId?"}
    CheckReviewableDB -- "Không hợp lệ" --> Throw400Review["Báo lỗi REVIEW_NOT_ALLOWED (400)"]
    CheckReviewableDB -- "Hợp lệ" --> InsertReview[("DB: INSERT INTO reviews (user_id, book_id, order_id, rating, comment)")]
    InsertReview --> TriggerRefreshRating[("DB: Tính toán lại rating_average & review_count trong bảng books")]
    TriggerRefreshRating --> CommitTxReview["Commit Transaction"]
    CommitTxReview --> SuccessReview["Hiển thị đánh giá mới & cập nhật điểm số sao trung bình trên trang sách"]

    HideButton --> EndNode(["Kết thúc"])
    BlockEdit --> EndNode
    SuccessReview --> EndNode
    Throw400Review --> EndNode
```

#### 3.2. Sơ đồ Tuần tự (Sequence Diagram) – Viết đánh giá và tính lại điểm xếp hạng của sách
```mermaid
sequenceDiagram
    autonumber
    actor User as Khách hàng
    participant Modal as ReviewDialog (Frontend)
    participant Ctrl as MeReviewController
    participant Svc as ReviewService
    participant Repo as ReviewRepository
    participant DB as Database (PostgreSQL)

    User->>Modal: Chọn 5 sao, nhập "Sách rất hay, đóng gói cẩn thận", bấm Gửi
    Modal->>Ctrl: POST /api/me/reviews { orderId: 88, bookId: 42, rating: 5, comment: "..." }
    Ctrl->>Ctrl: requireAuth & validate(createReviewSchema)
    Ctrl->>Svc: reviewService.createReview(userId, input)
    
    rect rgb(255, 250, 240)
        Note over Svc, DB: Transaction tạo review & cập nhật điểm tích luỹ cuốn sách
        Svc->>Repo: withTransaction(async (client))
        Svc->>Repo: isReviewable(userId, 88, 42, client)
        Repo->>DB: SELECT 1 FROM orders o JOIN order_items oi ON o.id = oi.order_id<br/>WHERE o.id = 88 AND o.user_id = $1 AND o.status = 'DELIVERED' AND oi.book_id = 42
        DB-->>Repo: true
        
        Svc->>Repo: insert({ userId, orderId: 88, bookId: 42, rating: 5, comment: "..." }, client)
        Repo->>DB: INSERT INTO reviews (user_id, order_id, book_id, rating, comment) VALUES (...) RETURNING id
        DB-->>Repo: reviewId = 101
        
        Svc->>Repo: refreshBookRating(42, client)
        Repo->>DB: UPDATE books SET rating_average = (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE book_id = 42 AND is_hidden = false),<br/>rating_count = (SELECT COUNT(*) FROM reviews WHERE book_id = 42 AND is_hidden = false)<br/>WHERE id = 42
        DB-->>Repo: Book rating updated
    end
    
    Svc->>Repo: findMine(userId, 101, 30)
    Repo->>DB: SELECT r.*, b.title as book_title FROM reviews r JOIN books b ON r.book_id = b.id WHERE r.id = 101
    DB-->>Repo: MyReview entity
    Repo-->>Svc: review
    Svc-->>Ctrl: review
    Ctrl-->>Modal: 201 Created (JSON review)
    Modal-->>User: Đóng modal, hiển thị đánh giá vừa đăng thành công
```

---

### CHỨC NĂNG 4: KHUYẾN MÃI & FLASH SALE (MODULE 12 - F17)
*Tương ứng mục 15 trong ghi chú.*

#### 4.1. Sơ đồ Hoạt động (Activity Diagram) – Tạo chiến dịch Flash Sale (Admin) & Mua hàng Flash Sale
```mermaid
flowchart TD
    %% Nhánh Admin thiết lập
    AdminStart(["Admin vào Quản lý Flash Sale (/admin/flash-sales)"]) --> AdminCreate["Bấm 'Tạo đợt Flash Sale mới'"]
    AdminCreate --> InputSaleData["Nhập Tên, Giờ bắt đầu, Giờ kết thúc, Chọn danh sách sách, Giá giảm, Số suất bán, Giới hạn mỗi khách"]
    InputSaleData --> ValidateSaleInput{"startAt < endAt và Giá sale < Giá gốc?"}
    ValidateSaleInput -- "Sai" --> ShowSaleError["Báo lỗi validation (422)"]
    ValidateSaleInput -- "Hợp lệ" --> PostAdminSale["Gọi POST /api/admin/flash-sales"]
    PostAdminSale --> CheckOverlap{"assertNoOverlap: Trùng thời gian với đợt đang ACTIVE khác?"}
    CheckOverlap -- "Có trùng" --> Throw409Overlap["Báo lỗi FLASH_SALE_OVERLAP (409) kèm tên đợt bị trùng"]
    CheckOverlap -- "Không trùng" --> SaveSaleToDB[("DB: INSERT flash_sales & flash_sale_items")]
    SaveSaleToDB --> NotifySaleCreated["Tạo chiến dịch Flash Sale thành công"]

    %% Nhánh Khách hàng mua
    UserStart(["Khách hàng vào trang Lời nguyền nửa đêm (/flash-sale)"]) --> FetchCurrentSale["Tải GET /api/flash-sales/current"]
    FetchCurrentSale --> HasActiveSale{"Có đợt đang diễn ra không?"}
    HasActiveSale -- "Không" --> ShowUpcoming["Hiển thị thông tin đợt sắp mở hoặc banner thông báo"]
    HasActiveSale -- "Có" --> DisplayFlashBooks["Hiển thị đồng hồ đếm ngược + danh sách sách Flash Sale + thanh tiến độ đã bán (sold / quantity)"]
    DisplayFlashBooks --> AddToCartFlash["Khách chọn mua cuốn sách Flash Sale"]
    AddToCartFlash --> CheckPerUserLimit{"Số lượng mua + đã mua trước đây <= perUserLimit?"}
    CheckPerUserLimit -- "Vượt quá" --> ApplyRegularPrice["Chỉ áp dụng giá Flash Sale cho số suất cho phép; phần vượt tính giá thường"]
    CheckPerUserLimit -- "Trong hạn mức & Còn suất" --> LockFlashPrice["Áp dụng giá flash_sale_price và đưa vào giỏ hàng"]
    LockFlashPrice --> CheckoutOrder["Khách tiến hành Đặt hàng (Giữ suất & tăng sold)"]

    NotifySaleCreated --> EndNode(["Kết thúc"])
    CheckoutOrder --> EndNode
    ShowUpcoming --> EndNode
    Throw409Overlap --> EndNode
```

#### 4.2. Sơ đồ Tuần tự (Sequence Diagram) – Admin tạo chương trình Flash Sale & kiểm tra chồng chéo thời gian
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as AdminFlashSaleForm.tsx
    participant Ctrl as AdminFlashSaleController
    participant Svc as FlashSaleService
    participant Repo as FlashSaleRepository
    participant DB as Database (PostgreSQL)

    Admin->>UI: Nhập tên chương trình, chọn ngày giờ bắt đầu/kết thúc, chọn sách & giá sale
    UI->>Ctrl: POST /api/admin/flash-sales (Body, Bearer Token)
    Ctrl->>Ctrl: requireRole('ADMIN') & validate(createFlashSaleSchema)
    Ctrl->>Svc: flashSaleService.create(input)
    
    rect rgb(240, 245, 255)
        Note over Svc, DB: Kiểm tra không chồng chéo thời gian (assertNoOverlap)
        Svc->>Repo: withTransaction(async (client))
        Svc->>Repo: findOverlap(startAt, endAt, null, client)
        Repo->>DB: SELECT id, name, start_at, end_at FROM flash_sales<br/>WHERE is_active = true AND (start_at, end_at) OVERLAPS ($1, $2)
        DB-->>Repo: null (Không trùng)
        
        Svc->>Repo: insert(flashSaleData, client)
        Repo->>DB: INSERT INTO flash_sales (name, start_at, end_at, is_active) VALUES (...) RETURNING id
        DB-->>Repo: flashSaleId = 7
        
        loop Với từng sách trong danh sách Flash Sale
            Svc->>Repo: insertItem(7, bookItem, client)
            Repo->>DB: INSERT INTO flash_sale_items (flash_sale_id, book_id, sale_price, quantity, per_user_limit)<br/>VALUES (7, $bookId, $salePrice, $quantity, $perUserLimit)
            DB-->>Repo: Inserted
        end
    end
    
    Svc-->>Ctrl: AdminFlashSaleDetail
    Ctrl-->>UI: 201 Created (JSON FlashSale)
    UI-->>Admin: Thông báo tạo thành công, chuyển hướng về bảng danh sách đợt sale
```

---

### CHỨC NĂNG 5: QUẢN LÝ SÁCH & TỒN KHO (ADMIN) (MODULE 02 - F03, MỤC 17 & 6 ADMIN)
*Tương ứng mục 17 & một phần mục 6 trong ghi chú.*

#### 5.1. Sơ đồ Hoạt động (Activity Diagram) – Quản trị Sách & Điều chỉnh/Nhập hàng Tồn kho
```mermaid
flowchart TD
    Start(["Admin truy cập Bảng quản trị (/admin)"]) --> SelectMenu{"Chọn mục quản trị"}

    %% Quản lý sách
    SelectMenu -- "Quản lý Sách (/admin/sach)" --> BookAction{"Thao tác Sách"}
    BookAction -- "Thêm sách mới" --> FillBookForm["Nhập tiêu đề, giá bán, ISBN, số trang, chọn Danh mục, Tác giả, NXB, Upload ảnh bìa"]
    FillBookForm --> ValidateBook{"Dữ liệu hợp lệ?"}
    ValidateBook -- "Không" --> ShowBookError["Báo lỗi validation (422)"]
    ValidateBook -- "Hợp lệ" --> SaveBookDB[("DB: Lưu sách mới vào books, book_categories, book_authors")]
    SaveBookDB --> BookSuccess["Sách được kích hoạt và xuất hiện trên cửa hàng"]

    BookAction -- "Sửa / Ẩn sách" --> UpdateBook["Cập nhật thông tin hoặc đổi is_active = false"]
    UpdateBook --> SaveUpdateDB[("DB: Cập nhật thông tin sách")]
    SaveUpdateDB --> BookSuccess

    %% Quản lý tồn kho
    SelectMenu -- "Quản lý Tồn kho (/admin/ton-kho)" --> ChooseInventoryAction{"Thao tác kho"}
    ChooseInventoryAction -- "Xem cảnh báo tồn kho" --> FilterLowStock["Lọc sách có stock <= reorder_point"]
    ChooseInventoryAction -- "Thay đổi tồn kho (changeStock)" --> SelectBookInventory["Chọn cuốn sách cần cập nhật tồn kho"]
    SelectBookInventory --> ChooseType{"Loại điều chỉnh"}
    
    ChooseType -- "IMPORT (Nhập hàng thêm)" --> InputImport["Nhập số lượng nhập thêm (quantity > 0), ghi chú nhập"]
    InputImport --> ExecImport["Tính stock = currentStock + quantity"]
    
    ChooseType -- "ADJUST (Kiểm kê/Đặt lại)" --> InputAdjust["Nhập tồn kho thực tế (newStock >= 0), lý do điều chỉnh"]
    InputAdjust --> CheckChange{"newStock khác currentStock?"}
    CheckChange -- "Trùng khớp" --> ThrowUnchanged["Báo lỗi: Tồn kho thực tế không thay đổi"]
    CheckChange -- "Khác" --> ExecAdjust["Tính stock = newStock"]

    ExecImport --> LockStockTx["Mở Transaction & Khoá sách (lockStock FOR UPDATE)"]
    ExecAdjust --> LockStockTx
    LockStockTx --> CheckNegative{"Tồn kho sau tính toán >= 0?"}
    CheckNegative -- "Âm" --> ThrowNegativeStock["Báo lỗi INSUFFICIENT_STOCK: Tồn kho không được âm"]
    CheckNegative -- "Hợp lệ" --> UpdateBookStock[("DB: UPDATE books SET stock = $stock WHERE id = $bookId")]
    UpdateBookStock --> InsertInventoryLog[("DB: INSERT INTO inventory_logs (book_id, change, stock_after, reason, note, created_by)")]
    InsertInventoryLog --> CommitInventoryTx["Commit Transaction"]
    CommitInventoryTx --> InventorySuccess["Cập nhật tồn kho thành công & hiển thị lịch sử biến động"]

    BookSuccess --> EndNode(["Kết thúc"])
    InventorySuccess --> EndNode
    ThrowUnchanged --> EndNode
    ThrowNegativeStock --> EndNode
```

#### 5.2. Sơ đồ Tuần tự (Sequence Diagram) – Quá trình Nhập hàng & Ghi nhật ký biến động kho (Inventory Log)
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as StockDialog.tsx
    participant Ctrl as AdminInventoryController
    participant Svc as InventoryService
    participant BookRepo as BookRepository
    participant LogRepo as InventoryLogRepository
    participant DB as Database (PostgreSQL)

    Admin->>UI: Chọn sách ID 10, chọn "Nhập thêm hàng", số lượng: +50, ghi chú: "Nhập đợt 2"
    UI->>Ctrl: POST /api/admin/inventory/books/10/stock { type: 'IMPORT', quantity: 50, note: 'Nhập đợt 2' }
    Ctrl->>Ctrl: requireRole('ADMIN') & validate(changeStockSchema)
    Ctrl->>Svc: inventoryService.changeStock(10, input, adminId)
    
    rect rgb(240, 255, 240)
        Note over Svc, DB: Transaction & Khoá hàng tồn kho (lockStock)
        Svc->>BookRepo: withTransaction(async (client))
        Svc->>BookRepo: lockStock(10, client)
        BookRepo->>DB: SELECT stock FROM books WHERE id = 10 FOR UPDATE
        DB-->>BookRepo: currentStock = 15
        
        Svc->>Svc: Tính: stock = 15 + 50 = 65, change = +50
        
        Svc->>BookRepo: setStock(10, 65, client)
        BookRepo->>DB: UPDATE books SET stock = 65, updated_at = NOW() WHERE id = 10
        DB-->>BookRepo: Updated
        
        Svc->>LogRepo: insert({ bookId: 10, change: 50, stockAfter: 65, reason: 'IMPORT', note: 'Nhập đợt 2', createdBy: adminId }, client)
        LogRepo->>DB: INSERT INTO inventory_logs (book_id, change, stock_after, reason, note, created_by) VALUES (...)
        DB-->>LogRepo: Log inserted
    end
    
    Svc-->>Ctrl: { bookId: 10, previousStock: 15, stock: 65, change: 50 }
    Ctrl-->>UI: 200 OK (JSON result)
    UI-->>Admin: Đóng dialog, hiển thị badge tồn kho mới 65 cuốn
```

---

### CHỨC NĂNG 6: QUẢN LÝ KHÁCH HÀNG & ĐƠN HÀNG (ADMIN) (MODULE 08 - F13)
*Tương ứng mục 18 trong ghi chú.*

#### 6.1. Sơ đồ Hoạt động (Activity Diagram) – Xử lý Đơn hàng & Khoá tài khoản vi phạm
```mermaid
flowchart TD
    AdminStart(["Admin vào menu Quản trị"]) --> ChooseTab{"Chọn tab quản lý"}

    %% Luồng Đơn hàng
    ChooseTab -- "Quản lý Đơn hàng (/admin/don-hang)" --> ViewOrders["Xem danh sách đơn hàng có phân trang & lọc trạng thái"]
    ViewOrders --> SelectOrder["Chọn xem chi tiết một Đơn hàng"]
    SelectOrder --> DecideOrderAction{"Quyết định thao tác đơn"}

    DecideOrderAction -- "Cập nhật tiến trình" --> NextStatus{"Trạng thái kế tiếp"}
    NextStatus -- "CONFIRMED (Xác nhận đơn)" --> CheckPending{"Trạng thái hiện tại là PENDING?"}
    NextStatus -- "SHIPPING (Giao cho bên vận chuyển)" --> CheckConfirmed{"Trạng thái hiện tại là CONFIRMED?"}
    NextStatus -- "COMPLETED (Đã giao hàng thành công)" --> CheckShipping{"Trạng thái hiện tại là SHIPPING?"}
    CheckPending -- "Hợp lệ" --> SaveStatus[("DB: Cập nhật status đơn hàng & ghi order_status_history")]
    CheckConfirmed -- "Hợp lệ" --> SaveStatus
    CheckShipping -- "Hợp lệ" --> SaveStatus
    SaveStatus --> SendNotifyCustomer["Tự động gửi thông báo / email tiến độ cho khách"]

    DecideOrderAction -- "Admin Huỷ đơn (adminCancel)" --> InputCancelReason["Nhập lý do huỷ đơn & ghi chú"]
    InputCancelReason --> CheckCancellable{"Trạng thái thuộc [PENDING, CONFIRMED, SHIPPING]?"}
    CheckCancellable -- "Không (Đã giao hoặc đã huỷ)" --> ThrowCannotCancel["Báo lỗi: Đơn hàng không thể huỷ ở trạng thái này"]
    CheckCancellable -- "Được huỷ" --> StartCancelTx["Mở Transaction huỷ đơn"]
    StartCancelTx --> RestockBooks[("DB: Hoàn trả số lượng tồn kho của các cuốn sách (reason: 'CANCEL')")]
    RestockBooks --> ReleaseVoucher[("DB: Hoàn lại lượt sử dụng voucher nếu đơn có áp mã")]
    ReleaseVoucher --> ReleaseFlash[("DB: Hoàn lại suất Flash Sale nếu có")]
    ReleaseFlash --> MarkOrderCancelled[("DB: UPDATE status = 'CANCELLED'")]
    MarkOrderCancelled --> SendCancelEmail["Gửi email thông báo huỷ đơn kèm lý do cho khách"]

    %% Luồng Khách hàng
    ChooseTab -- "Quản lý Khách hàng (/admin/khach-hang)" --> ViewCustomers["Xem danh sách khách hàng, tổng chi tiêu & số đơn"]
    ViewCustomers --> CustomerAction{"Thao tác tài khoản"}
    CustomerAction -- "Khoá tài khoản (lockCustomer)" --> InputLockReason["Nhập lý do khoá"]
    InputLockReason --> ExecLockTx["Mở Transaction: UPDATE is_active = false, locked_reason = reason"]
    ExecLockTx --> RevokeAllCustomerSessions[("DB: DELETE FROM refresh_tokens WHERE user_id = $customerId")]
    RevokeAllCustomerSessions --> SuccessLock["Tài khoản bị khoá, mọi access token bị từ chối ngay lập tức"]
    
    CustomerAction -- "Mở khoá tài khoản (unlockCustomer)" --> ExecUnlock[("DB: UPDATE is_active = true, locked_reason = null")]
    ExecUnlock --> SuccessUnlock["Tài khoản được phục hồi hoạt động bình thường"]

    SendNotifyCustomer --> EndNode(["Kết thúc"])
    SendCancelEmail --> EndNode
    SuccessLock --> EndNode
    SuccessUnlock --> EndNode
    ThrowCannotCancel --> EndNode
```

#### 6.2. Sơ đồ Tuần tự (Sequence Diagram) – Admin huỷ đơn hàng kèm hoàn trả tồn kho và voucher
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as AdminOrderDetail.tsx
    participant Ctrl as AdminOrderController
    participant Svc as OrderService
    participant OrderRepo as OrderRepository
    participant BookRepo as BookRepository
    participant LogRepo as InventoryLogRepository
    participant Mailer as EmailService
    participant DB as Database (PostgreSQL)

    Admin->>UI: Bấm "Huỷ đơn", nhập lý do "Khách gọi điện yêu cầu đổi địa chỉ nhận"
    UI->>Ctrl: POST /api/admin/orders/55/cancel { reason: "Khách gọi điện...", note: "..." }
    Ctrl->>Ctrl: requireRole('ADMIN') & validate(adminCancelOrderSchema)
    Ctrl->>Svc: orderService.adminCancel(55, input, adminId)
    
    rect rgb(255, 240, 245)
        Note over Svc, DB: Transaction Huỷ đơn & Hoàn kho (cancelAndRestock)
        Svc->>OrderRepo: withTransaction(async (client))
        Svc->>OrderRepo: lockForStatus(55, client)
        OrderRepo->>DB: SELECT * FROM orders WHERE id = 55 FOR UPDATE
        DB-->>OrderRepo: Order (status: 'CONFIRMED', paymentStatus: 'UNPAID')
        
        Svc->>OrderRepo: markCancelled(55, reason, client)
        OrderRepo->>DB: UPDATE orders SET status = 'CANCELLED', cancel_reason = $reason WHERE id = 55
        DB-->>OrderRepo: Updated
        
        Svc->>OrderRepo: addStatusHistory(55, { from: 'CONFIRMED', to: 'CANCELLED', changedBy: adminId, note }, client)
        OrderRepo->>DB: INSERT INTO order_status_history (...) VALUES (...)
        DB-->>OrderRepo: History added
        
        loop Với từng sản phẩm trong đơn hàng
            Svc->>BookRepo: increaseStock(item.bookId, item.quantity, client)
            BookRepo->>DB: UPDATE books SET stock = stock + $quantity, sold_count = sold_count - $quantity WHERE id = $bookId
            DB-->>BookRepo: Stock increased
            
            Svc->>LogRepo: insert({ bookId: item.bookId, change: item.quantity, reason: 'CANCEL', note: 'Huỷ đơn #55' }, client)
            LogRepo->>DB: INSERT INTO inventory_logs (...)
            DB-->>LogRepo: Log recorded
        end
        
        opt Nếu đơn có áp dụng Voucher
            Svc->>DB: Hoàn lại usage_count của voucher
        end
    end
    
    Svc->>Mailer: sendEmail(orderCancelledEmail({ user, order, reason }))
    Mailer-->>User: Gửi email thông báo đơn đã huỷ
    Svc-->>Ctrl: OrderDetail (Cancelled)
    Ctrl-->>UI: 200 OK (JSON order)
    UI-->>Admin: Cập nhật giao diện đơn thành "Đã huỷ", nút thao tác bị vô hiệu hoá
```

---

### CHỨC NĂNG 7: DASHBOARD & BÁO CÁO DOANH THU (ADMIN) (MODULE 14 - F19)
*Tương ứng mục 19 trong ghi chú.*

#### 7.1. Sơ đồ Hoạt động (Activity Diagram) – Xem Dashboard & Xuất Báo cáo CSV
```mermaid
flowchart TD
    Start(["Admin truy cập Dashboard (/admin)"]) --> LoadFilter["Chọn bộ lọc thời gian: Hôm nay, 7 ngày, Tháng này hoặc Tuỳ chọn (from - to)"]
    LoadFilter --> FetchMetrics["Gọi GET /api/admin/dashboard/metrics?from=...&to=..."]
    
    FetchMetrics --> QueryMetricsDB[("DB: Thực hiện các truy vấn thống kê song song:")]
    QueryMetricsDB --> CalcKPI["Tính tổng doanh thu, số đơn hoàn thành, số khách hàng mới, số sách bán được & tỷ lệ tăng trưởng"]
    QueryMetricsDB --> CalcChart["Nhóm doanh thu theo mốc thời gian (revenueOverTime)"]
    QueryMetricsDB --> CalcStatus["Đếm phân bổ trạng thái đơn (statusDistribution)"]
    QueryMetricsDB --> CalcTopBooks["Lấy danh sách Top 10 cuốn sách bán chạy nhất"]
    QueryMetricsDB --> CalcLowStock["Lấy danh sách sách có tồn kho <= ngưỡng cảnh báo"]
    
    CalcKPI --> RenderDashboard["Hiển thị lên màn hình: 4 Thẻ KPI + Biểu đồ đường + Biểu đồ tròn + Danh sách sách bán chạy"]
    CalcChart --> RenderDashboard
    CalcStatus --> RenderDashboard
    CalcTopBooks --> RenderDashboard
    CalcLowStock --> RenderDashboard

    RenderDashboard --> UserAction{"Admin thao tác"}
    UserAction -- "Xem & theo dõi số liệu" --> EndNode(["Kết thúc"])
    UserAction -- "Bấm 'Xuất báo cáo CSV'" --> RequestCSV["Gửi yêu cầu GET /api/admin/dashboard/reports/orders.csv"]
    RequestCSV --> FetchReportData[("DB: Lấy toàn bộ đơn hàng trong kỳ kèm thông tin khách & tiền")]
    FetchReportData --> BuildCSVContent["Xây dựng nội dung CSV: Chèn ký tự UTF-8 BOM (\uFEFF) + Header tiếng Việt có dấu + Escape ký tự đặc biệt"]
    BuildCSVContent --> StreamCSVResponse["Thiết lập HTTP Header: Content-Type: text/csv; charset=utf-8 & Content-Disposition: attachment"]
    StreamCSVResponse --> DownloadCSV["Trình duyệt tự động tải xuống file bao-cao-don-hang.csv hiển thị chuẩn tiếng Việt trên Excel"]
    DownloadCSV --> EndNode
```

#### 7.2. Sơ đồ Tuần tự (Sequence Diagram) – Luồng xuất báo cáo đơn hàng định dạng CSV chống lỗi font Excel
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as DashboardHeader.tsx
    participant Ctrl as AdminDashboardController
    participant Svc as ReportService
    participant Repo as DashboardRepository
    participant DB as Database (PostgreSQL)

    Admin->>UI: Bấm nút "Xuất báo cáo", chọn khoảng ngày 01/10/2026 - 31/10/2026
    UI->>Ctrl: GET /api/admin/dashboard/reports/orders.csv?from=2026-10-01&to=2026-10-31
    Ctrl->>Ctrl: requireRole('ADMIN') & validate(reportQuerySchema)
    Ctrl->>Svc: reportService.exportOrdersReportCSV({ from, to }, res)
    
    Svc->>Repo: listOrdersForReport({ from, to })
    Repo->>DB: SELECT o.id, o.code, o.created_at, u.full_name, u.email, o.status,<br/>o.payment_method, o.total_amount, o.discount_amount, o.final_amount<br/>FROM orders o JOIN users u ON o.user_id = u.id WHERE o.created_at BETWEEN $1 AND $2
    DB-->>Repo: Danh sách 450 dòng đơn hàng
    Repo-->>Svc: orderRecords
    
    Note over Svc, Ctrl: Thiết lập header UTF-8 BOM tránh lỗi tiếng Việt trong Microsoft Excel
    Svc->>Ctrl: res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    Svc->>Ctrl: res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-don-hang-2026-10.csv"')
    Svc->>Ctrl: res.write('\uFEFF') (BOM Header)
    Svc->>Ctrl: res.write("Mã đơn,Ngày đặt,Khách hàng,Email,Trạng thái,Phương thức,Tổng tiền,Thành tiền\n")
    
    loop Duyệt qua từng dòng đơn hàng
        Svc->>Svc: formatRow(record) (escape dấu phẩy và ngoặc kép)
        Svc->>Ctrl: res.write(csvLine)
    end
    
    Svc->>Ctrl: res.end()
    Ctrl-->>UI: File stream tải về trực tiếp
    UI-->>Admin: Trình duyệt hoàn tất lưu file CSV về máy tính
```

---

### CHỨC NĂNG 8: AI GỢI Ý SÁCH THEO SỞ THÍCH (GROQ) (MODULE 15 - F20)
*Tương ứng mục 20 trong ghi chú ("AI nhưng chưa rõ ràng").*

#### 8.1. Sơ đồ Hoạt động (Activity Diagram) – Onboarding sở thích & Sinh gợi ý thông minh
```mermaid
flowchart TD
    UserStart(["Khách hàng đăng nhập vào hệ thống"]) --> CheckOnboarded{"Đã từng lưu hoặc bỏ qua sở thích (onboarded == true)?"}
    
    %% Luồng Onboarding
    CheckOnboarded -- "Chưa" --> AutoShowDialog["Tự động mở Popup Chào mừng: 'Bạn thích đọc gì?' (PreferenceOnboardingDialog)"]
    AutoShowDialog --> UserChoice{"Người dùng tương tác"}
    UserChoice -- "Bấm Bỏ qua" --> SkipPref["Gọi POST /api/me/preferences/skip"]
    SkipPref --> SaveSkipDB[("DB: UPDATE user_preferences SET onboarded = true")]
    SaveSkipDB --> CloseModal["Đóng Popup & không hỏi lại ở các lần đăng nhập sau"]
    
    UserChoice -- "Chọn thể loại, tác giả, tầm giá & Lưu" --> SubmitPref["Gọi PUT /api/me/preferences"]
    SubmitPref --> SavePrefDB[("DB: Lưu thông tin vào user_preferences & user_preferred_categories")]
    SavePrefDB --> InvalidateRecCache["Xoá cache gợi ý cũ của người dùng"]

    %% Luồng AI Gợi ý sách
    CloseModal --> ViewRecommendPage
    InvalidateRecCache --> ViewRecommendPage["Khách hàng vào trang Tiên tri AI (/goi-y-sach) hoặc Trang chủ"]
    ViewRecommendPage --> FetchRecs["Gọi GET /api/me/recommendations"]
    FetchRecs --> CheckCacheDB{"Đã có gợi ý được lưu trong bảng recommendations và chưa hết hạn TTL?"}
    
    CheckCacheDB -- "Đã có cache" --> ReturnCachedRecs["Lấy danh sách sách gợi ý từ DB + lý do gợi ý"]
    CheckCacheDB -- "Chưa có cache HOẶC Bấm 'Làm mới gợi ý'" --> CheckRateLimit{"Kiểm tra Rate Limit (recommendRefreshLimiter: 5 lượt/giờ)?"}
    
    CheckRateLimit -- "Vượt quá" --> Throw429["Báo lỗi 429: Bạn đã làm mới quá nhanh, vui lòng chờ chút"]
    CheckRateLimit -- "Hợp lệ" --> LoadDataForAI["Đọc sở thích người dùng + Lịch sử mua hàng + Top 50 sách sẵn có trong kho"]
    LoadDataForAI --> BuildPrompt["Xây dựng Prompt chuẩn JSON (recommend-prompt.ts)"]
    BuildPrompt --> CallGroqAPI["Gửi Request đến Groq Cloud API (Model: llama-3.3-70b-versatile)"]
    CallGroqAPI --> CheckAIResult{"Groq trả về JSON hợp lệ chứa danh sách book_id?"}
    
    CheckAIResult -- "Lỗi kết nối / Model bận" --> FallbackRecs["Dùng thuật toán dự phòng: Gợi ý sách theo danh mục yêu thích + Bán chạy"]
    CheckAIResult -- "Thành công" --> ParseAIJSON["Trích xuất book_id và lý do gợi ý cá nhân hoá"]
    ParseAIJSON --> SaveNewRecsToDB[("DB: Lưu danh sách mới vào recommendations (TTL: 7 ngày)")]
    SaveNewRecsToDB --> RenderUIRecommendations["Hiển thị danh sách thẻ sách với lời tựa ma mị 'Tiên tri AI gợi ý cho bạn'"]
    FallbackRecs --> RenderUIRecommendations
    ReturnCachedRecs --> RenderUIRecommendations

    RenderUIRecommendations --> EndNode(["Kết thúc"])
    Throw429 --> EndNode
```

#### 8.2. Sơ đồ Tuần tự (Sequence Diagram) – Quy trình Gọi Groq AI sinh danh sách gợi ý cá nhân hoá
```mermaid
sequenceDiagram
    autonumber
    actor User as Khách hàng
    participant Page as RecommendationPage.tsx
    participant Ctrl as MeRecommendationController
    participant Limiter as RateLimitMiddleware
    participant Svc as RecommendationService
    participant GroqClient as Groq AI Client (groq.ts)
    participant GroqAPI as Groq Cloud API (LLaMA 3.3)
    participant DB as Database (PostgreSQL)

    User->>Page: Bấm nút "Triệu hồi gợi ý mới"
    Page->>Ctrl: POST /api/me/recommendations/refresh (Bearer Token)
    Ctrl->>Limiter: recommendRefreshLimiter (Check IP/UserId counter)
    Limiter-->>Ctrl: Pass (Chưa vượt giới hạn)
    Ctrl->>Svc: recommendationService.refreshRecommendations(userId)
    
    rect rgb(245, 240, 255)
        Note over Svc, DB: Thu thập ngữ cảnh của bạn đọc
        Svc->>DB: SELECT * FROM user_preferences WHERE user_id = $1
        DB-->>Svc: Preferences (thích Thám tử, Kinh dị, tác giả Conan Doyle)
        Svc->>DB: Lấy lịch sử 10 cuốn sách đã mua gần nhất của user
        DB-->>Svc: Purchased book titles
        Svc->>DB: SELECT id, title, description, category_id, author_names FROM books WHERE stock > 0 AND is_active = true LIMIT 50
        DB-->>Svc: Available books catalogue
    end
    
    Svc->>Svc: buildRecommendPrompt({ preferences, history, books })
    Svc->>GroqClient: chatCompletion(systemPrompt, userPrompt, jsonMode = true)
    GroqClient->>GroqAPI: POST https://api.groq.com/openai/v1/chat/completions (model: llama-3.3-70b-versatile)
    GroqAPI-->>GroqClient: 200 OK (JSON: { recommendations: [{ bookId: 12, reason: "Hợp gu truyện trinh thám..." }, ...] })
    GroqClient-->>Svc: Parsed AI recommendations
    
    rect rgb(240, 255, 245)
        Note over Svc, DB: Cập nhật bộ đệm gợi ý vào Database
        Svc->>DB: DELETE FROM recommendations WHERE user_id = $1
        DB-->>Svc: Old recommendations cleared
        loop Lưu từng gợi ý mới
            Svc->>DB: INSERT INTO recommendations (user_id, book_id, reason, created_at) VALUES ($1, $bookId, $reason, NOW())
        end
    end
    
    Svc-->>Ctrl: RecommendationResponse
    Ctrl-->>Page: 200 OK (JSON { items, generatedAt })
    Page-->>User: Quả cầu ma thuật xoay & hiển thị sách gợi ý kèm lời bình AI
```

---

## PHẦN 3: TỔNG HỢP KIẾN TRÚC MÃ NGUỒN CỦA HƯƠNG TRONG DỰ ÁN

| Module | Tên Module | Controller & Service | Repository | Bảng Database liên quan |
|---|---|---|---|---|
| **M02** | Admin Books & Inventory | `admin/book.*`, `inventory.service.ts`, `category.service.ts` | `book.repository.ts`, `inventory-log.repository.ts` | `books`, `book_categories`, `book_authors`, `inventory_logs` |
| **M04** | User Profile & Address | `me.controller.ts`, `address.controller.ts`, `profile.service.ts`, `address.service.ts` | `user.repository.ts`, `address.repository.ts`, `refresh-token.repository.ts` | `users`, `user_addresses`, `refresh_tokens` |
| **M08** | Admin Customer & Orders | `customer.service.ts`, `order.service.ts` (admin functions) | `user.repository.ts`, `order.repository.ts` | `users`, `orders`, `order_items`, `order_status_history` |
| **M09** | Wishlist | `wishlist.controller.ts`, `wishlist.service.ts` | `wishlist.repository.ts` | `wishlists`, `books` |
| **M10** | Reviews | `review.controller.ts`, `review.service.ts` | `review.repository.ts` | `reviews`, `books`, `orders` |
| **M12** | Flash Sale | `flash-sale.controller.ts`, `flash-sale.service.ts` | `flash-sale.repository.ts` | `flash_sales`, `flash_sale_items`, `books` |
| **M14** | Admin Dashboard & Reports | `admin/dashboard.controller.ts`, `dashboard.service.ts`, `report.service.ts` | `admin/dashboard.repository.ts` | `orders`, `order_items`, `books`, `users` |
| **M15** | AI Recommendations | `preference.controller.ts`, `recommendation.controller.ts`, `preference.service.ts`, `recommendation.service.ts` | `preference.repository.ts`, `recommendation.repository.ts` | `user_preferences`, `user_preferred_categories`, `recommendations`, `books` |

---
*Tài liệu được khởi tạo và đối chiếu tự động với 100% mã nguồn thực tế của dự án BookStore.*
