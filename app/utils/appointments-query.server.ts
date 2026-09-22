import type { Prisma } from "@prisma/client";

export type AppointmentListFilters = {
  status: string;
  customerEmail: string;
  dealerEmail: string;
  storeName: string;
};

export type AppointmentListSort = {
  sortBy: "appointmentDate" | "createdAt";
  sortDir: "asc" | "desc";
};

export function parseAppointmentListParams(searchParams: URLSearchParams): {
  filters: AppointmentListFilters;
  sort: AppointmentListSort;
  page: number;
  limit: number;
} {
  return {
    filters: {
      status: searchParams.get("status") || "",
      customerEmail: searchParams.get("customerEmail") || "",
      dealerEmail: searchParams.get("dealerEmail") || "",
      storeName: searchParams.get("storeName") || "",
    },
    sort: {
      sortBy: searchParams.get("sortBy") === "createdAt" ? "createdAt" : "appointmentDate",
      sortDir: searchParams.get("sortDir") === "asc" ? "asc" : "desc",
    },
    page: parseInt(searchParams.get("page") || "1", 10) || 1,
    limit: parseInt(searchParams.get("limit") || "20", 10) || 20,
  };
}

export function buildAppointmentWhere(
  filters: AppointmentListFilters,
): Prisma.AppointmentWhereInput {
  const where: Prisma.AppointmentWhereInput = {};

  if (filters.status === "arrived") {
    where.status = { in: ["arrived", "confirmed"] };
  } else if (filters.status) {
    where.status = filters.status;
  }
  if (filters.customerEmail) {
    where.customerEmail = { contains: filters.customerEmail };
  }
  if (filters.dealerEmail) {
    where.dealerEmail = { contains: filters.dealerEmail };
  }
  if (filters.storeName) {
    where.storeName = { contains: filters.storeName };
  }

  return where;
}

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function formatProductsForCsv(products: string | null | undefined): string {
  if (!products) return "";
  try {
    const parsed = JSON.parse(products);
    if (Array.isArray(parsed)) {
      return parsed
        .map((p) => {
          if (typeof p === "string") return p;
          if (p && typeof p === "object" && p.name) {
            return p.quantity && p.quantity > 1 ? `${p.name} x${p.quantity}` : p.name;
          }
          return JSON.stringify(p);
        })
        .join("; ");
    }
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed === "object" && parsed.name) return String(parsed.name);
  } catch {
    if (products !== "[]") return products;
  }
  return "";
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Booked";
    case "confirmed":
    case "arrived":
      return "Arrived";
    case "completed":
      return "Completed Test Ride";
    case "voucher_issued":
      return "Voucher Issued";
    case "voucher_redeemed":
      return "Voucher Redeemed";
    default:
      return status;
  }
}

const CSV_HEADERS = [
  "id",
  "customerName",
  "customerEmail",
  "customerPhone",
  "dealerEmail",
  "storeId",
  "storeName",
  "storeAddress",
  "serviceType",
  "products",
  "status",
  "statusLabel",
  "appointmentDate",
  "duration",
  "notes",
  "arrivedAt",
  "completedAt",
  "voucherIssuedAt",
  "voucherRedeemedAt",
  "createdAt",
  "updatedAt",
] as const;

type AppointmentCsvRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  dealerEmail: string;
  storeId: string | null;
  storeName: string | null;
  storeAddress: string | null;
  serviceType: string;
  products: string | null;
  status: string;
  appointmentDate: Date;
  duration: number;
  notes: string | null;
  arrivedAt: Date | null;
  completedAt: Date | null;
  voucherIssuedAt: Date | null;
  voucherRedeemedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function appointmentsToCsv(rows: AppointmentCsvRow[]): string {
  const lines = [CSV_HEADERS.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.customerName,
        row.customerEmail,
        row.customerPhone,
        row.dealerEmail,
        row.storeId,
        row.storeName,
        row.storeAddress,
        row.serviceType,
        formatProductsForCsv(row.products),
        row.status,
        formatStatusLabel(row.status),
        row.appointmentDate.toISOString(),
        row.duration,
        row.notes,
        row.arrivedAt?.toISOString() ?? "",
        row.completedAt?.toISOString() ?? "",
        row.voucherIssuedAt?.toISOString() ?? "",
        row.voucherRedeemedAt?.toISOString() ?? "",
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  return lines.join("\r\n") + "\r\n";
}
