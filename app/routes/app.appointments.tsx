import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const FUNNEL_STATUSES = [
  { key: "pending", label: "Booked" },
  { key: "arrived", label: "Arrived" },
  { key: "completed", label: "Completed Test Ride" },
  { key: "voucher_issued", label: "Voucher Issued" },
  { key: "voucher_redeemed", label: "Voucher Redeemed" },
] as const;

async function loadFunnelCounts() {
  const groups = await prisma.appointment.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const byStatus: Record<string, number> = {};
  for (const g of groups) {
    byStatus[g.status] = g._count.status;
  }

  const arrived = (byStatus.arrived || 0) + (byStatus.confirmed || 0);

  return {
    pending: byStatus.pending || 0,
    arrived,
    completed: byStatus.completed || 0,
    voucher_issued: byStatus.voucher_issued || 0,
    voucher_redeemed: byStatus.voucher_redeemed || 0,
  };
}

function mapAppointment(apt: any) {
  let products: any[] = [];

  if (apt.products) {
    try {
      const parsed = JSON.parse(apt.products);
      if (Array.isArray(parsed)) {
        products = parsed;
      } else if (typeof parsed === "string") {
        products = [{ name: parsed, type: "test_ride", quantity: 1 }];
      } else if (typeof parsed === "object") {
        products = [parsed];
      }
    } catch {
      if (typeof apt.products === "string" && apt.products !== "[]") {
        products = [{ name: apt.products, type: "test_ride", quantity: 1 }];
      }
    }
  }

  return {
    ...apt,
    appointmentDate: apt.appointmentDate.toISOString(),
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
    arrivedAt: apt.arrivedAt ? apt.arrivedAt.toISOString() : null,
    completedAt: apt.completedAt ? apt.completedAt.toISOString() : null,
    voucherIssuedAt: apt.voucherIssuedAt ? apt.voucherIssuedAt.toISOString() : null,
    voucherRedeemedAt: apt.voucherRedeemedAt ? apt.voucherRedeemedAt.toISOString() : null,
    products,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const status = url.searchParams.get("status") || "";
  const customerEmail = url.searchParams.get("customerEmail") || "";
  const dealerEmail = url.searchParams.get("dealerEmail") || "";
  const storeName = url.searchParams.get("storeName") || "";
  const sortBy = url.searchParams.get("sortBy") === "createdAt" ? "createdAt" : "appointmentDate";
  const sortDir = url.searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const skip = (page - 1) * limit;
  const where: any = {};

  if (status === "arrived") {
    where.status = { in: ["arrived", "confirmed"] };
  } else if (status) {
    where.status = status;
  }
  if (customerEmail) where.customerEmail = { contains: customerEmail };
  if (dealerEmail) where.dealerEmail = { contains: dealerEmail };
  if (storeName) where.storeName = { contains: storeName };

  const [appointments, total, funnel] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortDir },
    }),
    prisma.appointment.count({ where }),
    loadFunnelCounts(),
  ]);

  return {
    appointments: appointments.map(mapAppointment),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: { status, customerEmail, dealerEmail, storeName },
    sort: { sortBy, sortDir },
    funnel,
  };
};

export default function AppointmentsPage() {
  const { appointments, pagination, filters, sort, funnel } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (localFilters.status) params.set("status", localFilters.status);
    if (localFilters.customerEmail) params.set("customerEmail", localFilters.customerEmail);
    if (localFilters.dealerEmail) params.set("dealerEmail", localFilters.dealerEmail);
    if (localFilters.storeName) params.set("storeName", localFilters.storeName);
    if (sort.sortBy !== "appointmentDate") params.set("sortBy", sort.sortBy);
    if (sort.sortDir !== "desc") params.set("sortDir", sort.sortDir);
    params.set("page", "1");
    setSearchParams(params);
  };

  const clearFilters = () => {
    setLocalFilters({ status: "", customerEmail: "", dealerEmail: "", storeName: "" });
    setSearchParams(new URLSearchParams());
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);
  };

  const toggleDateSort = () => {
    const params = new URLSearchParams(searchParams);
    const nextDir = sort.sortBy === "appointmentDate" && sort.sortDir === "desc" ? "asc" : "desc";
    params.set("sortBy", "appointmentDate");
    params.set("sortDir", nextDir);
    params.set("page", "1");
    setSearchParams(params);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#fbbf24";
      case "confirmed":
      case "arrived":
        return "#10b981";
      case "completed":
        return "#6366f1";
      case "voucher_issued":
        return "#0ea5e9";
      case "voucher_redeemed":
        return "#00704a";
      case "cancelled":
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  };

  const formatStatusLabel = (status: string) => {
    const found = FUNNEL_STATUSES.find((s) => s.key === status);
    if (found) return found.label;
    if (status === "confirmed") return "Arrived";
    return status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatProducts = (products: any[]) => {
    if (!products || products.length === 0) return null;

    return products.map((p, i) => {
      if (typeof p === "string") {
        return (
          <div key={i} style={{ fontSize: "12px" }}>
            {p}
          </div>
        );
      }
      return (
        <div key={i} style={{ fontSize: "12px" }}>
          {p.name}
          {p.quantity && p.quantity > 1 ? ` x${p.quantity}` : ""}
        </div>
      );
    });
  };

  return (
    <s-page heading="Appointments">
      <s-section>
        <div style={{ padding: "16px", backgroundColor: "#f6f6f7", borderRadius: "8px", marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px", fontWeight: "600", fontSize: "16px" }}>Filters</div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
            <div style={{ flex: "1", minWidth: "180px" }}>
              <div style={{ marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Status</div>
              <select
                value={localFilters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #c9cccf",
                  borderRadius: "4px",
                  fontSize: "14px",
                  backgroundColor: "white",
                }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Booked</option>
                <option value="arrived">Arrived</option>
                <option value="completed">Completed Test Ride</option>
                <option value="voucher_issued">Voucher Issued</option>
                <option value="voucher_redeemed">Voucher Redeemed</option>
              </select>
            </div>
            <div style={{ flex: "1", minWidth: "180px" }}>
              <div style={{ marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Customer Email</div>
              <input
                type="text"
                value={localFilters.customerEmail}
                onChange={(e) => handleFilterChange("customerEmail", e.target.value)}
                placeholder="Search by email..."
                style={{ width: "100%", padding: "8px", border: "1px solid #c9cccf", borderRadius: "4px", fontSize: "14px" }}
              />
            </div>
            <div style={{ flex: "1", minWidth: "180px" }}>
              <div style={{ marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Dealer Email</div>
              <input
                type="text"
                value={localFilters.dealerEmail}
                onChange={(e) => handleFilterChange("dealerEmail", e.target.value)}
                placeholder="Search by dealer..."
                style={{ width: "100%", padding: "8px", border: "1px solid #c9cccf", borderRadius: "4px", fontSize: "14px" }}
              />
            </div>
            <div style={{ flex: "1", minWidth: "180px" }}>
              <div style={{ marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Store Name</div>
              <input
                type="text"
                value={localFilters.storeName}
                onChange={(e) => handleFilterChange("storeName", e.target.value)}
                placeholder="Search by store..."
                style={{ width: "100%", padding: "8px", border: "1px solid #c9cccf", borderRadius: "4px", fontSize: "14px" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <s-button onClick={applyFilters}>Apply Filters</s-button>
            <s-button onClick={clearFilters} variant="tertiary">
              Clear
            </s-button>
          </div>
        </div>

        <div style={{ marginBottom: "8px", fontWeight: "600", fontSize: "15px" }}>Test Ride Funnel</div>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          {FUNNEL_STATUSES.map((stage) => (
            <div
              key={stage.key}
              style={{
                flex: 1,
                padding: "14px",
                border: "1px solid #e1e3e5",
                borderRadius: "8px",
                minWidth: "140px",
                background: "#fff",
              }}
            >
              <div style={{ fontSize: "12px", color: "#6d7175" }}>{stage.label}</div>
              <div style={{ fontSize: "22px", fontWeight: "600" }}>{funnel[stage.key]}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, padding: "16px", border: "1px solid #e1e3e5", borderRadius: "8px", minWidth: "200px" }}>
            <div style={{ fontSize: "13px", color: "#6d7175" }}>Total Appointments</div>
            <div style={{ fontSize: "24px", fontWeight: "600" }}>{pagination.total}</div>
          </div>
          <div style={{ flex: 1, padding: "16px", border: "1px solid #e1e3e5", borderRadius: "8px", minWidth: "200px" }}>
            <div style={{ fontSize: "13px", color: "#6d7175" }}>Current Page</div>
            <div style={{ fontSize: "24px", fontWeight: "600" }}>
              {pagination.page} / {pagination.totalPages || 1}
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          {appointments.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", backgroundColor: "#f6f6f7", borderRadius: "8px" }}>
              <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>No appointments found</div>
              <div style={{ color: "#6d7175" }}>Try adjusting your filters or check back later.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Customer</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Service</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Products</th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Store Info</th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontWeight: "600",
                      cursor: "pointer",
                      userSelect: "none",
                      whiteSpace: "nowrap",
                    }}
                    onClick={toggleDateSort}
                    title="Click to sort by appointment date"
                  >
                    Date & Time{" "}
                    <span style={{ color: "#6d7175", fontSize: "12px" }}>
                      {sort.sortBy === "appointmentDate" ? (sort.sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "500" }}>{apt.customerName}</div>
                      <div style={{ fontSize: "12px", color: "#6d7175" }}>{apt.customerEmail}</div>
                      {apt.customerPhone && (
                        <div style={{ fontSize: "12px", color: "#6d7175" }}>{apt.customerPhone}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{apt.serviceType}</div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      {apt.products && apt.products.length > 0 ? (
                        formatProducts(apt.products)
                      ) : (
                        <span style={{ color: "#9ca3af" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {apt.storeName && (
                        <div style={{ fontWeight: "500", fontSize: "13px" }}>{apt.storeName}</div>
                      )}
                      {apt.storeAddress && (
                        <div style={{ fontSize: "11px", color: "#6d7175", marginTop: "2px" }}>
                          {apt.storeAddress.substring(0, 60)}
                          {apt.storeAddress.length > 60 ? "..." : ""}
                        </div>
                      )}
                      {!apt.storeName && apt.dealerEmail && (
                        <div style={{ fontSize: "12px", color: "#6d7175" }}>{apt.dealerEmail}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{formatDate(apt.appointmentDate)}</div>
                      <div style={{ fontSize: "12px", color: "#6d7175" }}>Created: {formatDate(apt.createdAt)}</div>
                      {apt.arrivedAt && (
                        <div style={{ fontSize: "12px", color: "#6d7175" }}>Arrived: {formatDate(apt.arrivedAt)}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor: getStatusBadgeColor(apt.status),
                          color: "white",
                        }}
                      >
                        {formatStatusLabel(apt.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <s-button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1}>
              Previous
            </s-button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <s-button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}
