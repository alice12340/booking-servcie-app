import type { LoaderFunctionArgs } from 'react-router'
import prisma from 'app/db.server'

// GET - 确认预约
export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params

  // 缺少 ID 参数 - 返回友好错误页面
  if (!id) {
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invalid Request</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            background: white;
            padding: 48px 40px;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            text-align: center;
            max-width: 450px;
            margin: 20px;
            animation: fadeIn 0.4s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .icon { font-size: 72px; margin-bottom: 24px; }
          h1 { color: #f5576c; margin-bottom: 12px; font-size: 28px; font-weight: 600; }
          p { color: #555; line-height: 1.6; margin: 16px 0; font-size: 16px; }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 32px;
            background: #f5576c;
            color: white;
            text-decoration: none;
            border-radius: 40px;
            font-weight: 600;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
            font-size: 14px;
          }
          .btn:hover {
            background: #d43f52;
            transform: scale(1.02);
          }
          .note {
            margin-top: 24px;
            font-size: 13px;
            color: #aaa;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⚠️</div>
          <h1>Invalid Request</h1>
          <p>Sorry, the appointment link is missing or invalid.</p>
          <p>Please check the link or contact us for assistance.</p>
          <a href="/" class="btn">Go to Homepage</a>
          <p class="note">📞 Need help? Call us at (555) 123-4567</p>
        </div>
      </body>
      </html>`,
      {
        status: 400,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    )
  }

  try {
    // 查找预约
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    })

    // 预约不存在 - 返回友好错误页面
    if (!appointment) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Not Found</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              background: white;
              padding: 48px 40px;
              border-radius: 24px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.15);
              text-align: center;
              max-width: 450px;
              margin: 20px;
              animation: fadeIn 0.4s ease-out;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .icon { font-size: 72px; margin-bottom: 24px; }
            h1 { color: #f5576c; margin-bottom: 12px; font-size: 28px; font-weight: 600; }
            p { color: #555; line-height: 1.6; margin: 16px 0; font-size: 16px; }
            .btn {
              display: inline-block;
              margin-top: 20px;
              padding: 12px 32px;
              background: #f5576c;
              color: white;
              text-decoration: none;
              border-radius: 40px;
              font-weight: 600;
              transition: all 0.3s;
              border: none;
              cursor: pointer;
              font-size: 14px;
            }
            .btn:hover {
              background: #d43f52;
              transform: scale(1.02);
            }
            .note {
              margin-top: 24px;
              font-size: 13px;
              color: #aaa;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🔍</div>
            <h1>Appointment Not Found</h1>
            <p>Sorry, we couldn't find the appointment you're looking for.</p>
           
          </div>
        </body>
        </html>`,
        {
          status: 404,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      )
    }

    // 如果已经确认，直接返回成功页面
    if (appointment.status === 'confirmed') {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Already Confirmed</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 48px 40px;
              border-radius: 24px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.15);
              text-align: center;
              max-width: 500px;
              margin: 20px;
              animation: fadeIn 0.4s ease-out;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .icon { font-size: 72px; margin-bottom: 24px; }
            h1 { color: #4CAF50; margin-bottom: 12px; font-size: 28px; font-weight: 600; }
            p { color: #555; line-height: 1.6; margin: 16px 0; font-size: 16px; }
            .details {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 16px;
              margin-top: 24px;
              text-align: left;
              border: 1px solid #e9ecef;
            }
            .details p { margin: 10px 0; font-size: 14px; }
            .details strong { color: #333; }
            .note {
              margin-top: 20px;
              font-size: 13px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✅</div>
            <h1>Already Confirmed</h1>
            <p>This appointment has already been confirmed.</p>
            <div class="details">
              <p><strong>Appointment ID:</strong> ${appointment.id}</p>
              <p><strong>Customer:</strong> ${appointment.customerName}</p>
              <p><strong>Service:</strong> ${appointment.serviceType}</p>
              <p><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
            </div>
            <p class="note">If you have any questions, please contact us.</p>
          </div>
        </body>
        </html>`,
        {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }
      )
    }

    // 更新预约状态为 confirmed
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'confirmed' },
    })

    console.log(`Appointment ${id} confirmed by customer`)

    // 返回成功确认页面 - 欢迎到店
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to the Store!</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 48px 40px;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            text-align: center;
            max-width: 500px;
            margin: 20px;
            animation: slideIn 0.5s ease-out;
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .icon { font-size: 72px; margin-bottom: 24px; }
          h1 { color: #4CAF50; margin-bottom: 12px; font-size: 32px; font-weight: 700; }
          .subtitle { color: #666; font-size: 18px; margin-bottom: 16px; }
          p { color: #555; line-height: 1.6; margin: 16px 0; font-size: 16px; }
          .details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 16px;
            margin-top: 24px;
            text-align: left;
            border: 1px solid #e9ecef;
          }
          .details p { margin: 10px 0; font-size: 14px; }
          .details strong { color: #333; }
          .confirmation-note {
            margin-top: 20px;
            padding: 12px;
            background: #e8f5e9;
            border-radius: 12px;
            color: #2e7d32;
            font-size: 14px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">🎉</div>
          <h1>Welcome to the Store!</h1>
          <p class="subtitle">Thank you for confirming your arrival.</p>
          <p>We're happy to see you and ready to help!</p>
          <div class="details">
            <p><strong>Appointment ID:</strong> ${updatedAppointment.id}</p>
            <p><strong>Customer:</strong> ${updatedAppointment.customerName}</p>
            <p><strong>Service:</strong> ${updatedAppointment.serviceType}</p>
            <p><strong>Date:</strong> ${new Date(updatedAppointment.appointmentDate).toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
          </div>
         
        </div>
      </body>
      </html>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    )

  } catch (error) {
    console.error('Confirm appointment error:', error)
    // 系统错误 - 返回友好错误页面
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Something Went Wrong</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }
          .container {
            background: white;
            padding: 48px 40px;
            border-radius: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            text-align: center;
            max-width: 450px;
            margin: 20px;
            animation: fadeIn 0.4s ease-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .icon { font-size: 72px; margin-bottom: 24px; }
          h1 { color: #f5576c; margin-bottom: 12px; font-size: 28px; font-weight: 600; }
          p { color: #555; line-height: 1.6; margin: 16px 0; font-size: 16px; }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 32px;
            background: #f5576c;
            color: white;
            text-decoration: none;
            border-radius: 40px;
            font-weight: 600;
            transition: all 0.3s;
            border: none;
            cursor: pointer;
            font-size: 14px;
          }
          .btn:hover {
            background: #d43f52;
            transform: scale(1.02);
          }
          .note {
            margin-top: 24px;
            font-size: 13px;
            color: #aaa;
          }
          .error-detail {
            margin-top: 16px;
            padding: 12px;
            background: #fff5f5;
            border-radius: 12px;
            font-size: 12px;
            color: #c62828;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">❌</div>
          <h1>Something Went Wrong</h1>
          <p>Sorry, we couldn't confirm your appointment.</p>
          <p>Please try again or contact us for assistance.</p>
          <a href="/" class="btn">Back to Home</a>
          <div class="error-detail">
            Error: ${error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <p class="note">📞 Need help? Call us at (555) 123-4567</p>
        </div>
      </body>
      </html>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    )
  }
}