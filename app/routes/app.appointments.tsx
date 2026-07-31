import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const status = url.searchParams.get("status") || "";
  const customerEmail = url.searchParams.get("customerEmail") || "";
  const dealerEmail = url.searchParams.get("dealerEmail") || "";
  const storeName = url.searchParams.get("storeName") || ""; // 新增：店铺名称筛选

  const skip = (page - 1) * limit;
  const where: any = {};

  if (status) where.status = status;
  if (customerEmail) where.customerEmail = { contains: customerEmail };
  if (dealerEmail) where.dealerEmail = { contains: dealerEmail };
  if (storeName) where.storeName = { contains: storeName }; // 新增

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { appointmentDate: "desc" },
    }),
    prisma.appointment.count({ where }),
  ]);

  // 处理 products 字段，支持字符串和 JSON 两种格式
  const appointmentsWithProducts = appointments.map((apt) => {
    let products = [];
    
    if (apt.products) {
      try {
        // 尝试解析为 JSON
        const parsed = JSON.parse(apt.products);
        if (Array.isArray(parsed)) {
          products = parsed;
        } else if (typeof parsed === 'string') {
          // 如果是字符串，转换为数组格式
          products = [{ name: parsed, type: 'test_ride', quantity: 1 }];
        } else if (typeof parsed === 'object') {
          products = [parsed];
        }
      } catch {
        // 如果不是 JSON 格式，当作普通字符串处理
        if (typeof apt.products === 'string' && apt.products !== '[]') {
          products = [{ name: apt.products, type: 'test_ride', quantity: 1 }];
        }
      }
    }
    
    return {
      ...apt,
      appointmentDate: apt.appointmentDate.toISOString(),
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString(),
      products: products,
    };
  });

  return {
    appointments: appointmentsWithProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filters: { status, customerEmail, dealerEmail, storeName },
  };
};

export default function AppointmentsPage() {
  const { appointments, pagination, filters } = useLoaderData<typeof loader>();
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending": return "#fbbf24";
      case "confirmed": return "#10b981";
      case "cancelled": return "#ef4444";
      case "completed": return "#6366f1";
      default: return "#9ca3af";
    }
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

  // 格式化 products 显示
  const formatProducts = (products: any[]) => {
    if (!products || products.length === 0) return null;
    
    return products.map((p, i) => {
      if (typeof p === 'string') {
        return <div key={i} style={{ fontSize: "12px" }}>{p}</div>;
      }
      return (
        <div key={i} style={{ fontSize: "12px" }}>
          {p.name}{p.quantity && p.quantity > 1 ? ` x${p.quantity}` : ""}
          
        </div>
      );
    });
  };

  return (
    <s-page heading="Appointments">
      <s-section>
        {/* Filters */}
        <div style={{ padding: "16px", backgroundColor: "#f6f6f7", borderRadius: "8px", marginBottom: "16px" }}>
          <div style={{ marginBottom: "12px", fontWeight: "600", fontSize: "16px" }}>Filters</div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "12px" }}>
            <div style={{ flex: "1", minWidth: "180px" }}>
              <div style={{ marginBottom: "4px", fontSize: "13px", fontWeight: "500" }}>Status</div>
              <select
                value={localFilters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                style={{ width: "100%", padding: "8px", border: "1px solid #c9cccf", borderRadius: "4px", fontSize: "14px", backgroundColor: "white" }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                {/* <option value="cancelled">Cancelled</option> */}
                {/* <option value="completed">Completed</option> */}
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
            <s-button onClick={clearFilters} variant="tertiary">Clear</s-button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, padding: "16px", border: "1px solid #e1e3e5", borderRadius: "8px", minWidth: "200px" }}>
            <div style={{ fontSize: "13px", color: "#6d7175" }}>Total Appointments</div>
            <div style={{ fontSize: "24px", fontWeight: "600" }}>{pagination.total}</div>
          </div>
          <div style={{ flex: 1, padding: "16px", border: "1px solid #e1e3e5", borderRadius: "8px", minWidth: "200px" }}>
            <div style={{ fontSize: "13px", color: "#6d7175" }}>Current Page</div>
            <div style={{ fontSize: "24px", fontWeight: "600" }}>{pagination.page} / {pagination.totalPages || 1}</div>
          </div>
        </div>

        {/* Table */}
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
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Date & Time</th>
                  {/* <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Duration</th> */}
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: "600" }}>Status</th>
                  
                </tr>
              </thead>
              <tbody>
                {appointments.map((apt) => (
                  <tr key={apt.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ fontWeight: "500" }}>{apt.customerName}</div>
                      <div style={{ fontSize: "12px", color: "#6d7175" }}>{apt.customerEmail}</div>
                      {apt.customerPhone && <div style={{ fontSize: "12px", color: "#6d7175" }}>{apt.customerPhone}</div>}
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
                          {apt.storeAddress.substring(0, 60)}{apt.storeAddress.length > 60 ? "..." : ""}
                        </div>
                      )}
                      {!apt.storeName && apt.dealerEmail && (
                        <div style={{ fontSize: "12px", color: "#6d7175" }}>{apt.dealerEmail}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div>{formatDate(apt.appointmentDate)}</div>
                      <div style={{ fontSize: "12px", color: "#6d7175" }}>Created: {formatDate(apt.createdAt)}</div>
                    </td>
                    {/* <td style={{ padding: "12px" }}>{apt.duration} min</td> */}
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: getStatusBadgeColor(apt.status),
                        color: "white",
                      }}>
                        {apt.status}
                      </span>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "16px", alignItems: "center" }}>
            <s-button onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page === 1}>Previous</s-button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <s-button onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>Next</s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}