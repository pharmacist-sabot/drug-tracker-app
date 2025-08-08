// File: supabase/functions/send-telegram-notify/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// ดึงค่า Secrets ของ Telegram ที่เราตั้งค่าไว้ในขั้นตอนที่ 1
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

// สร้าง URL ของ Telegram API โดยใช้ Token ที่ดึงมา
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

// เริ่มการทำงานของ Server Function
serve(async (req) => {
  // ตั้งค่า CORS Headers เพื่อให้เว็บ Vue ของเราเรียกใช้ฟังก์ชันนี้ได้
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // ตอบกลับสำหรับ preflight request (จำเป็นสำหรับเบราว์เซอร์)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ตรวจสอบว่าตั้งค่า Secrets ครบถ้วนหรือไม่
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Telegram secrets (BOT_TOKEN or CHAT_ID) are not set in Supabase.')
    }

    // ดึงข้อมูล 'message' ที่ถูกส่งมาจากเว็บ Vue ของเรา
    const { message } = await req.json()
    if (!message) {
      throw new Error('Message text is required in the request body.')
    }

    // เตรียมข้อมูลที่จะส่งไปให้ Telegram ในรูปแบบ JSON
    const body = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'MarkdownV2', // เปิดใช้งานการจัดรูปแบบข้อความด้วย Markdown
    }

    // ส่ง Request ไปยัง Telegram API
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    // ตรวจสอบว่า Telegram ตอบกลับมาว่าสำเร็จหรือไม่
    if (!response.ok) {
      const errorBody = await response.json()
      console.error('Telegram API Error:', errorBody) // แสดง error ใน logs ของ function
      throw new Error(`Telegram API error: ${errorBody.description}`)
    }

    // ส่งผลลัพธ์ว่าสำเร็จกลับไปให้เว็บ Vue
    const data = { status: 'ok', message: 'Telegram notification sent successfully!' }
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // กรณีเกิดข้อผิดพลาด ให้ส่ง error กลับไปให้เว็บ Vue
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})