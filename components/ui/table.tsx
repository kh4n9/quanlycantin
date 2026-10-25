"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * Table của shadcn được dùng làm khung ngữ nghĩa cho bảng trong sổ cấp phát.
 *
 * Bản gốc của shadcn mang sẵn padding, đường kẻ, màu chữ và `whitespace-nowrap`
 * — những thứ sẽ đè lên cách trình bày giấy/mực đã có. Ở đây giữ nguyên cấu
 * trúc và `data-slot` nhưng để phần tạo dáng cho nơi gọi, nhờ vậy các bảng
 * hiện tại đổi sang component mà không lệch một điểm ảnh nào.
 *
 * Khung cuộn nằm ở nơi gọi (`.mem-cuon`) để `thead` còn dính được khi cuộn;
 * nếu component này tự bọc `overflow-x-auto` thì nó thành khung cuộn gần nhất
 * và làm hỏng `sticky top-0`.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full min-w-0">
      <table data-slot="table" className={cn("w-full", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" className={cn(className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn(className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" className={cn(className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" className={cn(className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return <th data-slot="table-head" className={cn(className)} {...props} />
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td data-slot="table-cell" className={cn(className)} {...props} />
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return <caption data-slot="table-caption" className={cn(className)} {...props} />
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
