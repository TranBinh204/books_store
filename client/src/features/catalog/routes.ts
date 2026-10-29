/** Đường dẫn trang danh mục */
export const categoryHref = (id: number) => `/danh-muc/${id}`;

/** Đường dẫn trang tìm kiếm theo từ khoá */
export const searchHref = (keyword: string) => `/tim-kiem?q=${encodeURIComponent(keyword)}`;
