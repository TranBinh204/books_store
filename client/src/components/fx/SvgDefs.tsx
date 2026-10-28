/**
 * Bộ lọc + hình SVG dùng lại, đặt MỘT lần ở layout (chép nguyên từ demo 07).
 * - Bộ lọc `#torn` (giấy da lớn) và `#torn-s` (tờ voucher nhỏ) — design-system mục 5.4
 * - <symbol>: dơi, vương miện, cú, 9 icon danh mục (`i-<key>`) + icon sách mặc định (`i-sach`)
 * Gọi lại bằng <svg><use href="#bat" /></svg> hoặc component <Icon name="fantasy" />.
 */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <filter id="torn" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.035"
          numOctaves={4}
          seed={7}
          result="n"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="n"
          scale={26}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
      <filter id="torn-s" x="-3%" y="-3%" width="106%" height="106%">
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={3} seed={3} result="n" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="n"
          scale={7}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      <symbol id="bat" viewBox="0 0 64 28">
        <path
          fill="currentColor"
          d="M32 10c2-4 4-6 4-6l1 5c4-3 12-5 27 0-7 1-11 6-12 12-4-4-9-3-12 1-2-3-5-4-8-4s-6 1-8 4c-3-4-8-5-12-1-1-6-5-11-12-12 15-5 23-3 27 0l1-5s2 2 4 6z"
        />
      </symbol>
      <symbol id="crown" viewBox="0 0 48 40">
        <path fill="currentColor" d="M6 34 2 10l12 10 10-16 10 16 12-10-4 24z" />
      </symbol>
      <symbol id="owl" viewBox="0 0 64 64">
        <path
          fill="currentColor"
          d="M12 10l9 9a24 24 0 0 1 22 0l9-9v26c0 15-9 24-20 24S12 51 12 36z"
        />
        <circle cx="24" cy="31" r="7" fill="#d9bd93" />
        <circle cx="40" cy="31" r="7" fill="#d9bd93" />
        <circle cx="24" cy="31" r="3" fill="#0e1311" />
        <circle cx="40" cy="31" r="3" fill="#0e1311" />
        <path d="M29 40l3 5 3-5z" fill="#d9bd93" />
      </symbol>

      {/* Icon danh mục — nét mảnh, theo currentColor (khóa = categories.icon_key) */}
      <symbol id="i-ky-nang" viewBox="0 0 120 120">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M60 106V56" />
          <path d="M60 72c-26 0-38-14-38-36 22 0 38 12 38 36z" />
          <path d="M60 60c0-24 14-40 40-40 0 26-16 40-40 40z" />
          <path d="M38 106h44" />
        </g>
      </symbol>
      <symbol id="i-tam-ly" viewBox="0 0 120 120">
        <g fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M12 60c20-30 76-30 96 0-20 30-76 30-96 0z" />
          <circle cx="60" cy="60" r="16" />
          <circle cx="60" cy="60" r="6" fill="currentColor" />
          <path d="M60 14v14M60 92v14M26 26l8 8M94 26l-8 8" strokeLinecap="round" />
        </g>
      </symbol>
      <symbol id="i-van-hoc" viewBox="0 0 120 120">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M100 12C62 18 38 48 32 94l8-4c4-12 10-22 18-28 14-2 26-10 32-22-8 2-14 2-20 0 12-6 22-14 30-28z" />
          <path d="M18 108l20-18" />
        </g>
      </symbol>
      <symbol id="i-thieu-nhi" viewBox="0 0 120 120">
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
          <path d="M76 20a40 40 0 1 0 28 62A34 34 0 0 1 76 20z" />
          <path d="M30 18l3 8 8 3-8 3-3 8-3-8-8-3 8-3zM46 52l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        </g>
      </symbol>
      <symbol id="i-ngon-tinh" viewBox="0 0 120 120">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M60 102S16 76 16 46a22 22 0 0 1 44-10 22 22 0 0 1 44 10c0 30-44 56-44 56z" />
          <path d="M36 44a10 10 0 0 1 10-10" />
        </g>
      </symbol>
      <symbol id="i-on-thi" viewBox="0 0 120 120">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 46 60 24l50 22-50 22z" />
          <path d="M30 56v26c18 14 42 14 60 0V56" />
          <path d="M110 46v30" />
        </g>
      </symbol>
      <symbol id="i-fantasy" viewBox="0 0 120 120">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="60" cy="52" r="34" />
          <path d="M38 40a24 24 0 0 1 14-12" />
          <path d="M36 86l-8 20h64l-8-20" />
          <path d="M60 38l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" />
        </g>
      </symbol>
      <symbol id="i-manga" viewBox="0 0 120 120">
        <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
          <path d="M66 10 30 66h26l-6 44 40-60H64z" />
        </g>
      </symbol>
      <symbol id="i-gia-dinh" viewBox="0 0 120 120">
        <g fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 110V60l10-14 10 14v50M80 110V60l10-14 10 14v50M40 110V40l20-28 20 28v70M52 110V86a8 8 0 0 1 16 0v24M10 110h100" />
          <circle cx="60" cy="52" r="6" />
        </g>
      </symbol>
      {/* Mặc định khi danh mục chưa chọn icon — cuốn sách mở + ngôi sao (theo logo) */}
      <symbol id="i-sach" viewBox="0 0 120 120">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 30c18-7 34-4 46 7 12-11 28-14 46-7v68c-18-7-34-4-46 7-12-11-28-14-46-7z" />
          <path d="M60 37v68" />
          <path d="M60 8l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="currentColor" />
        </g>
      </symbol>
    </svg>
  );
}
