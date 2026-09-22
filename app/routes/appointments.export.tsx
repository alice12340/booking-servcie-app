import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  appointmentsToCsv,
  buildAppointmentWhere,
  parseAppointmentListParams,
} from "../utils/appointments-query.server";

/**
 * GET /appointments/export?...filters
 * Downloads all appointments matching the same filters/sort as the list (no pagination).
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const url = new URL(request.url);
  const { filters, sort } = parseAppointmentListParams(url.searchParams);
  const where = buildAppointmentWhere(filters);

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { [sort.sortBy]: sort.sortDir },
  });

  const csv = appointmentsToCsv(appointments);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `appointments-${stamp}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};
