"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useId,
  type ChangeEvent,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import { cn } from "cn";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/* ==========================================================================
 * Bộ khối dựng giao diện của "Sổ cấp phát"
 *
 * Mọi màn hình dùng chung đúng bộ này để chữ, khoảng cách, đường kẻ và nhịp
 * chuyển động giống nhau như các trang của cùng một cuốn sổ.
 * ========================================================================== */

/* ----------------------------- Nút -----------------------------
   Nút chính là mực đặc trên giấy; viền mảnh, cạnh hơi vuông như con dấu đóng.
   Đỏ chỉ dành cho việc không hoàn tác được. */

type NutProps = ComponentPropsWithRef<"button"> & {
  kieu?: "chinh" | "phu" | "nguy" | "vien" | "mo";
  co?: "sm" | "md" | "lg";
};

export function Nut({ kieu = "vien", co = "md", className = "", ...rest }: NutProps) {
  const nen = {
    chinh:
      "border-muc bg-muc text-giay-cao shadow-[inset_0_1px_0_rgb(255_255_255/0.10),0_1px_2px_rgb(10_18_15/0.22)] hover:border-muc-dam hover:bg-muc-dam",
    phu: "border-ke-dam bg-giay text-muc shadow-xs hover:border-muc-mo hover:bg-white",
    nguy: "border-dau bg-dau text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:border-dau-dam hover:bg-dau-dam",
    vien: "border-ke-dam bg-white text-muc shadow-xs hover:border-muc-mo hover:bg-giay-cao",
    mo: "border-transparent bg-transparent text-muc-nhat hover:bg-muc/6 hover:text-muc",
  }[kieu];
  const coChu = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-3.5 text-sm", lg: "h-11 px-5 text-[15px]" }[co];
  return (
    <Button
      {...rest}
      variant="outline"
      size="default"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold tracking-[-0.005em] whitespace-nowrap transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-muc/45 focus-visible:ring-offset-1 active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
        nen,
        coChu,
        className
      )}
    />
  );
}

/* ---------------------------- Nhập liệu ---------------------------- */

const oNhapChung =
  "rounded-md border border-ke-dam bg-white px-3 py-2 text-sm text-muc shadow-[inset_0_1px_2px_rgb(19_30_25/0.04)] placeholder:text-muc-mo outline-none transition focus:border-muc focus:ring-2 focus:ring-muc/20 focus-visible:outline-hidden disabled:bg-giay disabled:text-muc-mo";

/**
 * Mặc định ô nhập rộng hết cỡ, nhưng nếu nơi gọi tự đặt bề rộng (w-36, w-44…)
 * thì bỏ mặc định đi. Không thể để hai lớp w-* chọi nhau: thứ tự class trong
 * thuộc tính không quyết định, thứ tự trong file CSS mới quyết định.
 */
function lopONhap(className: string): string {
  const tuDatBeRong = /(^|\s)w-/.test(className);
  return `${oNhapChung} ${tuDatBeRong ? "" : "w-full"} ${className}`;
}

export function OText({ className = "", ...rest }: ComponentPropsWithRef<"input">) {
  return <Input {...rest} className={cn("h-9", lopONhap(className))} />;
}

type LuaChon = { value: string; nhan: ReactNode; disabled?: boolean };

/** Đọc các thẻ <option> để chuyển sang Select của shadcn mà không phải sửa nơi gọi. */
function docLuaChon(children: ReactNode): LuaChon[] {
  const ds: LuaChon[] = [];
  Children.forEach(children, (con) => {
    if (!isValidElement(con)) return;
    if (con.type === Fragment) {
      ds.push(...docLuaChon((con.props as { children?: ReactNode }).children));
      return;
    }
    if (con.type === "option") {
      const p = con.props as {
        value?: string | number | readonly string[];
        children?: ReactNode;
        disabled?: boolean;
      };
      const value = p.value == null ? "" : String(p.value);
      ds.push({ value, nhan: p.children ?? value, disabled: p.disabled });
    }
  });
  return ds;
}

export function OChon({
  className = "",
  children,
  onChange,
  value,
  defaultValue,
  disabled,
  name,
  id,
  required,
  multiple,
  "aria-label": ariaLabel,
  title,
}: ComponentPropsWithRef<"select">) {
  // Trình duyệt vẫn cần select gốc cho trường hợp chọn nhiều; các màn hiện tại
  // chỉ dùng chọn một nên nhánh này chủ yếu để giữ tương thích API.
  if (multiple) {
    return (
      <select
        className={lopONhap(className)}
        onChange={onChange}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        id={id}
        required={required}
        aria-label={ariaLabel}
        title={title}
        multiple
      >
        {children}
      </select>
    );
  }

  const ds = docLuaChon(children);
  const giaTri = value == null ? undefined : String(value);
  const macDinh = defaultValue == null ? undefined : String(defaultValue);

  return (
    <Select
      items={ds.map((o) => ({ value: o.value, label: o.nhan }))}
      value={giaTri}
      defaultValue={macDinh}
      disabled={disabled}
      name={name}
      required={required}
      onValueChange={(v) => {
        if (!onChange) return;
        const giaTriMoi = v == null ? "" : String(v);
        onChange({
          target: { value: giaTriMoi },
          currentTarget: { value: giaTriMoi },
        } as unknown as ChangeEvent<HTMLSelectElement>);
      }}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        title={title}
        className={cn("h-9", lopONhap(className), "data-placeholder:text-muc-mo")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          {ds.map((o, i) => (
            <SelectItem key={`${o.value}-${i}`} value={o.value} disabled={o.disabled}>
              {o.nhan}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function OVung({ className = "", ...rest }: ComponentPropsWithRef<"textarea">) {
  return <Textarea {...rest} className={lopONhap(className)} />;
}

/** Nhãn ô nhập: chữ nhỏ, in hoa, giãn — như dòng in sẵn trên phiếu giấy */
export function ONhan({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Label
      className={cn(
        "mb-1.5 block font-mono text-[10.5px] font-medium tracking-[0.1em] text-muc-nhat uppercase",
        className
      )}
    >
      {children}
    </Label>
  );
}

/**
 * Ô tìm kiếm: biểu tượng kính lúp nằm sẵn trong khung, nút xoá hiện khi có chữ.
 * Dùng chung để ô tìm ở mọi màn hình cùng một dáng.
 */
export function OTim({
  className = "",
  ...rest
}: ComponentPropsWithRef<"input"> & { className?: string }) {
  const co = Boolean(rest.value);
  return (
    <div className={`relative ${/(^|\s)w-/.test(className) ? "" : "flex-1"} ${className}`}>
      <InputGroup className="h-9 rounded-md border-ke-dam bg-white shadow-[inset_0_1px_2px_rgb(19_30_25/0.04)] focus-within:border-muc focus-within:ring-2 focus-within:ring-muc/20">
        <InputGroupAddon className="pl-3 text-muc-mo">
          <BieuTuong ten="tim" className="h-4 w-4" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          {...rest}
          className="h-9 pr-8 text-sm text-muc placeholder:text-muc-mo [&::-webkit-search-cancel-button]:appearance-none"
        />
        {co && (
          <InputGroupAddon align="inline-end" className="pr-1.5">
            <InputGroupButton
              size="icon-xs"
              onClick={(e) => {
                // Xoá chữ rồi trả focus về ô nhập, gọi đúng onChange của nơi dùng
                const o = e.currentTarget.parentElement?.parentElement?.querySelector("input");
                if (!o) return;
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
                setter?.call(o, "");
                o.dispatchEvent(new Event("input", { bubbles: true }));
                o.focus();
              }}
              className="rounded-sm text-muc-mo hover:bg-muc/6 hover:text-muc"
              aria-label="Xoá từ khoá"
              title="Xoá từ khoá"
            >
              <BieuTuong ten="xoa" className="h-3.5 w-3.5" />
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
    </div>
  );
}

/**
 * Nhóm chọn nhanh khoảng ngày (Hôm nay / 7 ngày / Tháng này / Tất cả) đóng
 * khung như một phím gạt: mục đang áp dụng là mực đặc. Thay cho dãy nút rời
 * khiến người dùng phải đoán nút nào đang bật.
 *
 * Trên điện thoại, khung gạt cho phím sang mép trái và các ô vẫn nằm trên một
 * hàng — vẫn nhập được ngày bằng ô ngày kế bên.
 */
export function OChonKhoang<T extends string>({
  giaTri,
  onDoi,
  chon,
  className = "",
}: {
  giaTri: T | "";
  onDoi: (k: T) => void;
  chon: { khoa: T; nhan: string }[];
  className?: string;
}) {
  return (
    <ToggleGroup
      aria-label="Chọn nhanh khoảng ngày"
      value={giaTri ? [giaTri] : []}
      onValueChange={(v) => {
        const k = v[0];
        if (k) onDoi(k as T);
      }}
      spacing={2}
      className={`flex shrink-0 items-center gap-0.5 overflow-x-auto rounded-md border border-ke-dam bg-white p-0.5 shadow-xs ${className}`}
    >
      {chon.map((c) => {
        const bat = c.khoa === giaTri;
        return (
          <ToggleGroupItem
            key={c.khoa}
            value={c.khoa}
            aria-label={c.nhan}
            className={`h-7 min-w-0 shrink-0 rounded-sm px-2 font-mono text-[10.5px] font-medium tracking-[0.04em] whitespace-nowrap uppercase transition-colors sm:px-2.5 ${
              bat
                ? "border-transparent bg-muc! text-giay-cao! hover:bg-muc-dam!"
                : "border-transparent bg-transparent text-muc-nhat hover:bg-giay hover:text-muc"
            }`}
          >
            {c.nhan}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

/** Hai ô ngày nối bằng dấu mũi tên — một dáng chung cho mọi bộ lọc khoảng ngày. */
export function OKhoangNgay({
  tu,
  den,
  onTu,
  onDen,
  nhan = "Khoảng ngày",
}: {
  tu: string;
  den: string;
  onTu: (v: string) => void;
  onDen: (v: string) => void;
  nhan?: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Input
        type="date"
        value={tu}
        onChange={(e) => onTu(e.target.value)}
        aria-label={`${nhan} — từ ngày`}
        title="Từ ngày"
        className="h-9 w-36 rounded-md border-ke-dam bg-white px-2.5 font-mono text-[11.5px] text-muc shadow-xs focus-visible:border-muc focus-visible:ring-2 focus-visible:ring-muc/20"
      />
      <span aria-hidden className="text-muc-mo">
        →
      </span>
      <Input
        type="date"
        value={den}
        onChange={(e) => onDen(e.target.value)}
        aria-label={`${nhan} — đến ngày`}
        title="Đến ngày"
        className="h-9 w-36 rounded-md border-ke-dam bg-white px-2.5 font-mono text-[11.5px] text-muc shadow-xs focus-visible:border-muc focus-visible:ring-2 focus-visible:ring-muc/20"
      />
    </div>
  );
}

/** Công tắc dạng ô chọn: dùng cho các bộ lọc bật/tắt (vd. "Chỉ phiếu còn thiếu"). */
export function OCongTac({
  bat,
  onDoi,
  children,
  sac = "muc",
  title,
}: {
  bat: boolean;
  onDoi: (v: boolean) => void;
  children: ReactNode;
  sac?: "muc" | "moc";
  title?: string;
}) {
  const id = useId();
  const mau =
    sac === "moc"
      ? "border-moc/45 bg-moc-nhat text-moc"
      : "border-muc/35 bg-muc/6 text-muc";
  return (
    <Label
      htmlFor={id}
      title={title}
      className={`flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-[13px] font-normal transition select-none ${
        bat ? `${mau} font-medium` : "border-ke-dam bg-white text-muc-nhat shadow-xs hover:border-muc/40 hover:text-muc"
      }`}
    >
      <Checkbox
        id={id}
        checked={bat}
        onCheckedChange={(v) => onDoi(Boolean(v))}
        className={sac === "moc" ? "data-checked:border-moc data-checked:bg-moc" : ""}
      />
      {children}
    </Label>
  );
}

/* ----------------------------- Nhãn ----------------------------- */

export function Nhan({
  children,
  sac = "xam",
}: {
  children: ReactNode;
  sac?: "xam" | "xanh" | "vang" | "do" | "luc" | "lam";
}) {
  const mau = {
    xam: "bg-giay text-muc-nhat border-ke-dam",
    xanh: "bg-muc/6 text-muc border-muc/20",
    vang: "bg-moc-nhat text-moc border-moc/25",
    do: "bg-dau-nhat text-dau border-dau/25",
    luc: "bg-ngoc-nhat text-ngoc border-ngoc/25",
    lam: "bg-lam-nhat text-lam border-lam/25",
  }[sac];
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-auto items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-[0.04em] whitespace-nowrap",
        mau
      )}
    >
      {children}
    </Badge>
  );
}

/** Nhãn trạng thái có chấm tròn — dùng cho "Đang bán / Tạm dừng", "Hoạt động". */
export function NhanCham({
  children,
  sac,
  mo = false,
}: {
  children: ReactNode;
  sac: "ngoc" | "moc" | "dau" | "xam";
  mo?: boolean;
}) {
  const mau = {
    ngoc: "border-ngoc/25 bg-ngoc-nhat text-ngoc",
    moc: "border-moc/25 bg-moc-nhat text-moc",
    dau: "border-dau/25 bg-dau-nhat text-dau",
    xam: "border-ke-dam bg-giay text-muc-nhat",
  }[sac];
  const cham = { ngoc: "bg-ngoc", moc: "bg-moc", dau: "bg-dau", xam: "bg-ke-dam" }[sac];
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-auto items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[9.5px] font-medium tracking-[0.05em] whitespace-nowrap uppercase",
        mau
      )}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cham} ${mo ? "opacity-40" : ""}`} aria-hidden />
      {children}
    </Badge>
  );
}

/* ----------------------------- Thẻ -----------------------------
   Thẻ là một tờ phiếu: viền mảnh, không đổ bóng, dòng tiêu đề ngăn bằng đường
   xé nét đứt với hai răng giấy ở hai đầu. */

export function The({
  tieuDe,
  phuDe,
  so,
  hanhDong,
  children,
  className = "",
  thanClassName = "",
}: {
  tieuDe?: ReactNode;
  phuDe?: ReactNode;
  /** Số thứ tự tờ trong màn hình (01, 02, 03) — khoanh như số thứ tự dòng sổ */
  so?: string;
  hanhDong?: ReactNode;
  children: ReactNode;
  className?: string;
  thanClassName?: string;
}) {
  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden rounded-lg border border-ke bg-giay-cao py-0 text-muc shadow-the ring-0",
        className
      )}
    >
      {(tieuDe || hanhDong) && (
        <header className="khia flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {so && <SoTo so={so} />}
            <div className="min-w-0">
              {tieuDe && (
                <h2 className="truncate font-serif text-[15px] leading-tight font-semibold tracking-[-0.01em] text-muc">
                  {tieuDe}
                </h2>
              )}
              {phuDe && <p className="mt-0.5 truncate text-[12px] text-muc-nhat">{phuDe}</p>}
            </div>
          </div>
          {hanhDong && <div className="flex max-w-full flex-wrap items-center justify-end gap-2">{hanhDong}</div>}
        </header>
      )}
      <div className={thanClassName}>{children}</div>
    </Card>
  );
}

/** Số thứ tự tờ: khoanh tròn mảnh như số dòng trên sổ, chữ mono. */
export function SoTo({ so }: { so: string }) {
  return (
    <span
      aria-hidden
      className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-ke-dam px-1 font-mono text-[10.5px] font-medium text-muc-nhat"
    >
      {so}
    </span>
  );
}

/**
 * Ô số liệu — "một dòng sổ được đóng khung": nhãn in hoa nhỏ, con số lớn bằng
 * chữ số đẳng khoảng, kèm một dòng chú thích và biểu tượng rất nhạt.
 * Cả màn hình chỉ nên có một hàng ô số; số liệu trùng nhau thì gộp, đừng lặp.
 */
export function TheSo({
  nhan,
  giaTri,
  phu,
  icon,
  sac = "muc",
  nhanNho = false,
}: {
  nhan: string;
  giaTri: ReactNode;
  phu?: ReactNode;
  icon?: string;
  sac?: "muc" | "ngoc" | "moc" | "dau" | "lam";
  /** Con số là chữ (ngày tháng, tên) chứ không phải số đo — in nhỏ hơn chữ số */
  nhanNho?: boolean;
}) {
  const mauSo = {
    muc: "text-muc",
    ngoc: "text-ngoc",
    moc: "text-moc",
    dau: "text-dau",
    lam: "text-lam",
  }[sac];
  return (
    <Card className="relative gap-0 overflow-hidden rounded-lg border border-ke bg-giay-cao py-0 text-muc shadow-the ring-0">
      {icon && (
        <BieuTuong
          ten={icon}
          className="pointer-events-none absolute -right-3 -bottom-3 h-16 w-16 text-muc/[0.045]"
        />
      )}
      <div className="relative px-4 py-3">
        <div className="nhan-muc truncate">{nhan}</div>
        <div
          className={`so mt-1.5 font-semibold tracking-tight ${nhanNho ? "text-[17px]" : "text-[26px] leading-none"} ${mauSo}`}
        >
          {giaTri}
        </div>
        {phu && <div className="mt-1.5 truncate text-[11.5px] text-muc-nhat">{phu}</div>}
      </div>
    </Card>
  );
}

/* ---------------------------- Hộp thoại ---------------------------- */

export function HopThoai({
  mo,
  dong,
  tieuDe,
  children,
  chanTrang,
  rong = "max-w-lg",
  khoaEsc = false,
}: {
  mo: boolean;
  dong: () => void;
  tieuDe: ReactNode;
  children: ReactNode;
  chanTrang?: ReactNode;
  rong?: string;
  /** Giữ Escape cho hộp thoại con đang mở trên hộp thoại này. */
  khoaEsc?: boolean;
}) {
  return (
    <Dialog
      open={mo}
      onOpenChange={(open, details) => {
        if (open) return;
        if (khoaEsc && details.reason === "escape-key") {
          details.cancel();
          return;
        }
        dong();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          // `grid-cols-[minmax(0,1fr)]`: cột co được theo bề rộng hộp thoại, nhờ vậy bảng
          // rộng bên trong tự cuộn trong khung `.mem-cuon` thay vì đẩy cả hộp thoại tràn ngang.
          "top-12 grid-cols-[minmax(0,1fr)] max-h-[calc(100dvh-3rem)] translate-y-0 gap-0 overflow-y-auto rounded-lg border border-ke-dam bg-giay-cao p-0 shadow-noi",
          rong
        )}
      >
        <DialogHeader className="khia flex flex-row items-center justify-between gap-3 px-5 py-3.5">
          <DialogTitle className="font-serif text-[16px] leading-tight font-semibold tracking-[-0.01em] text-muc">
            {tieuDe}
          </DialogTitle>
          <DialogClose
            render={
              <button
                type="button"
                className="rounded-md p-1.5 text-muc-mo transition hover:bg-muc/6 hover:text-muc"
                aria-label="Đóng"
              />
            }
          >
            <BieuTuong ten="dong" className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="sr-only">
          {typeof tieuDe === "string" ? tieuDe : "Hộp thoại"}
        </DialogDescription>
        <div className="px-5 py-4">{children}</div>
        {chanTrang && (
          <DialogFooter className="mx-0 mb-0 flex-row items-center justify-end gap-2 rounded-none border-t border-ke bg-giay px-5 py-3">
            {chanTrang}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------- Thông báo ---------------------------- */

type TinNhan = { noiDung: string; sac: "luc" | "do" | "xanh" };

export function bao(msg: string, sac: TinNhan["sac"] = "luc") {
  if (sac === "do") toast.error(msg);
  else if (sac === "xanh") toast.info(msg);
  else toast.success(msg);
}

export function baoLoi(msg: string) {
  toast.error(msg);
}

export function HopThongBao() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "khong-in gap-2.5 rounded-md border border-ke border-l-[3px] bg-giay-cao font-sans text-muc shadow-noi",
          title: "font-medium text-muc",
          description: "text-muc-nhat",
          icon: "text-muc",
          actionButton: "bg-muc text-giay-cao",
          cancelButton: "border-ke-dam bg-giay text-muc",
          success: "border-l-ngoc [&_[data-icon]]:text-ngoc",
          error: "border-l-dau [&_[data-icon]]:text-dau",
          info: "border-l-muc [&_[data-icon]]:text-muc",
          warning: "border-l-moc [&_[data-icon]]:text-moc",
          loading: "border-l-ke-dam [&_[data-icon]]:text-muc-mo",
        },
      }}
    />
  );
}

/* ---------------------------- Trạng thái rỗng ---------------------------- */

export function Trong({
  tieuDe,
  moTa,
  hanhDong,
  icon = "phieu",
}: {
  tieuDe: string;
  moTa?: string;
  hanhDong?: ReactNode;
  icon?: string;
}) {
  return (
    <Empty className="gap-2.5 rounded-none border-0 px-6 py-14">
      <EmptyMedia className="rounded-lg border border-dashed border-ke-dam bg-giay p-3.5 text-muc-mo">
        <BieuTuong ten={icon} className="h-6 w-6" />
      </EmptyMedia>
      <EmptyHeader className="max-w-md gap-2">
        <EmptyTitle className="font-serif text-[15px] font-semibold text-muc">{tieuDe}</EmptyTitle>
        {moTa && <EmptyDescription className="text-[13px] leading-relaxed text-muc-nhat">{moTa}</EmptyDescription>}
      </EmptyHeader>
      {hanhDong && <EmptyContent className="mt-1.5">{hanhDong}</EmptyContent>}
    </Empty>
  );
}

/* ---------------------------- Bảng và phân trang ---------------------------- */

export const LOP_TIEU_DE_BANG =
  "sticky top-0 z-10 bg-giay/95 font-mono text-[10px] tracking-[0.08em] text-muc-mo uppercase backdrop-blur";

/** Thanh phân trang: "Trang 1 / 3 · 42 sổ mục" + hai nút. Ẩn khi chỉ có một trang. */
export function OPhanTrang({
  trang,
  soTrang,
  tong,
  onTrang,
  nhan = "mục",
  disabled = false,
}: {
  trang: number;
  soTrang: number;
  tong: number;
  onTrang: (t: number) => void;
  nhan?: string;
  disabled?: boolean;
}) {
  const so = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ke bg-giay px-3.5 py-2">
      <span className="font-mono text-[9.5px] tracking-[0.03em] text-muc-mo uppercase">
        Trang {so(trang)} / {so(Math.max(1, soTrang))} · {so(tong)} {nhan}
      </span>
      <div className="flex items-center gap-1.5">
        <Nut co="sm" disabled={trang <= 1 || disabled} onClick={() => onTrang(trang - 1)}>
          Trang trước
        </Nut>
        <Nut co="sm" disabled={trang >= soTrang || disabled} onClick={() => onTrang(trang + 1)}>
          Trang sau
        </Nut>
      </div>
    </div>
  );
}

/* ---------------------------- Biểu tượng ---------------------------- */

const DUONG_DAN: Record<string, string> = {
  ban: "M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6",
  phieu: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  kho: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  nhap: "M12 3v12m0 0 4-4m-4 4-4-4M4 19h16",
  xuat: "M12 21V9m0 0 4 4m-4-4-4 4M4 5h16",
  nguoi: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  bieu: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  cai: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z",
  khoa: "M6 11V7a6 6 0 0 1 12 0v4M5 11h14v10H5zM12 15v3",
  in: "M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v8H6z",
  tim: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  them: "M12 5v14M5 12h14",
  xoa: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  sua: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  tai: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  canh: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  check: "M20 6 9 17l-5-5",
  lich: "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  lammoi: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  xem: "M9 18l6-6-6-6",
  dong: "M18 6 6 18M6 6l12 12",
  xuong: "m6 9 6 6 6-6",
  chep: "M9 9h10v12H9zM5 15H3V3h12v2",
  trang: "M19 12H5M12 19l-7-7 7-7",
  tiep: "M5 12h14M12 5l7 7-7 7",
};

export function BieuTuong({ ten, className = "h-4 w-4" }: { ten: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={DUONG_DAN[ten] || DUONG_DAN.kho} />
    </svg>
  );
}

/* ---------------------------- Ô tìm gợi ý ---------------------------- */

/**
 * Khung chung cho danh sách gợi ý thả xuống (mặt hàng, can phạm, món lọc).
 * Danh sách chỉ hiện khi người dùng thật sự gõ — không bung ra khi ô vừa được
 * focus, nếu không màn hình Bán hàng bị che ngay khi mở.
 */
export const LOP_GOI_Y =
  "mem-cuon absolute z-30 mt-1 w-full overflow-y-auto rounded-md border border-ke bg-giay-cao py-1 shadow-noi";
