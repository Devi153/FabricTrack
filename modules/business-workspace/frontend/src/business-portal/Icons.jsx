import React from "react";
const paths = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  phone: "M8 3h8v18H8zM11 18h2",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3",
  fabric: "m3 6 9-4 9 4-9 4-9-4Zm0 6 9 4 9-4M3 18l9 4 9-4",
  spark: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z",
  back: "m14 5-7 7 7 7M7 12h14",
  plus: "M12 4v16M4 12h16",
  logout: "M9 4H4v16h5m6-13 5 5-5 5M9 12h11",
  close: "m6 6 12 12M6 18 18 6",
  mail: "M3 5h18v14H3zM3 5l9 7 9-7",
  alert: "M12 8v5m0 4h.01M12 2 1 22h22L12 2Z",
  leaf: "M21 3C9 1 3 7 4 14s10 9 14 1c2-4 2-8 3-12ZM4 21 15 10",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
};
export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.fabric} />
    </svg>
  );
}
