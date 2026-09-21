import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import prisma from 'app/db.server'

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function pageShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      min-height: 100vh;
      background: #f0f0f0;
      padding: 20px;
      color: #333;
    }
    .card {
      max-width: 480px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: #212322;
      color: #fff;
      padding: 24px 20px;
      text-align: center;
    }
    .header h1 { font-size: 20px; font-weight: 600; }
    .content { padding: 24px 20px; text-align: center; }
    .voucher {
      margin: 20px 0;
      padding: 20px;
      border: 2px dashed #00704a;
      border-radius: 12px;
      background: #f3faf6;
    }
    .voucher h2 { color: #00704a; font-size: 18px; margin-bottom: 8px; }
    .voucher p { font-size: 13px; color: #555; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: 40px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      background: #00704a;
      color: #fff;
      margin-top: 16px;
    }
    .note { margin-top: 16px; font-size: 12px; color: #888; }
    .error { color: #b91c1c; margin-bottom: 12px; font-size: 14px; }
    .success { color: #15803d; margin-bottom: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`
}

function renderRedeemPage(
  appointment: { id: string; customerName: string; status: string; voucherRedeemedAt: Date | null },
  options?: { message?: string; error?: string }
) {
  const redeemed = appointment.status === 'voucher_redeemed'
  const canRedeem = appointment.status === 'voucher_issued'

  let actionHtml = ''
  if (canRedeem) {
    actionHtml = `
      <form method="POST">
        <button type="submit" class="btn">Claim / Redeem Voucher</button>
      </form>
      <p class="note">Placeholder claim — real Starbucks codes will be added later.</p>`
  } else if (redeemed) {
    actionHtml = `<p class="success">This voucher has already been marked as redeemed.</p>
      <p class="note">${appointment.voucherRedeemedAt ? new Date(appointment.voucherRedeemedAt).toLocaleString('en-US') : ''}</p>`
  } else {
    actionHtml = `<p class="error">This voucher is not available to redeem yet (status: ${appointment.status}).</p>`
  }

  return pageShell(
    'Starbucks Voucher',
    `
    <div class="header"><h1>Starbucks Voucher</h1></div>
    <div class="content">
      ${options?.error ? `<p class="error">${options.error}</p>` : ''}
      ${options?.message ? `<p class="success">${options.message}</p>` : ''}
      <p>Hi ${appointment.customerName},</p>
      <div class="voucher">
        <h2>Placeholder Voucher</h2>
        <p>Thank you for completing your Test Ride. Your Starbucks voucher details will appear here once partner codes are configured.</p>
      </div>
      ${actionHtml}
    </div>`
  )
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  if (!id) {
    return htmlResponse(
      pageShell(
        'Invalid',
        `<div class="header"><h1>Invalid</h1></div><div class="content"><p>Missing appointment id.</p></div>`
      ),
      400
    )
  }

  const appointment = await prisma.appointment.findUnique({ where: { id } })
  if (!appointment) {
    return htmlResponse(
      pageShell(
        'Not Found',
        `<div class="header"><h1>Not Found</h1></div><div class="content"><p>Appointment not found.</p></div>`
      ),
      404
    )
  }

  return htmlResponse(renderRedeemPage(appointment))
}

export async function action({ params }: ActionFunctionArgs) {
  const { id } = params
  if (!id) {
    return htmlResponse(
      pageShell(
        'Invalid',
        `<div class="header"><h1>Invalid</h1></div><div class="content"><p>Missing appointment id.</p></div>`
      ),
      400
    )
  }

  const appointment = await prisma.appointment.findUnique({ where: { id } })
  if (!appointment) {
    return htmlResponse(
      pageShell(
        'Not Found',
        `<div class="header"><h1>Not Found</h1></div><div class="content"><p>Appointment not found.</p></div>`
      ),
      404
    )
  }

  if (appointment.status === 'voucher_redeemed') {
    return htmlResponse(renderRedeemPage(appointment, { message: 'Already redeemed.' }))
  }

  if (appointment.status !== 'voucher_issued') {
    return htmlResponse(
      renderRedeemPage(appointment, {
        error: 'Voucher can only be redeemed after it has been issued.',
      })
    )
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: 'voucher_redeemed',
      voucherRedeemedAt: new Date(),
    },
  })

  console.log(`Appointment ${id} voucher redeemed`)
  return htmlResponse(
    renderRedeemPage(updated, { message: 'Voucher marked as redeemed. Thank you!' })
  )
}
