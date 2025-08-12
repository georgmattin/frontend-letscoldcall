import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email } = await request.json()

    // Proovi esmalt port 465 (SSL), siis port 587 (STARTTLS)
    const smtpConfigs = [
      {
        host: process.env.SMTP_HOST || 'mail.veebimajutus.ee',
        port: 465,
        secure: true, // SSL
        auth: {
          user: process.env.SMTP_USER || 'no-reply@wecoldcall.com',
          pass: process.env.SMTP_PASS || 'Ks1Ku-nlTC'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false
        }
      },
      {
        host: process.env.SMTP_HOST || 'mail.veebimajutus.ee',
        port: 587,
        secure: false, // STARTTLS
        auth: {
          user: process.env.SMTP_USER || 'no-reply@wecoldcall.com',
          pass: process.env.SMTP_PASS || 'Ks1Ku-nlTC'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false
        }
      }
    ]

    let transporter
    let lastError

    // Proovi mõlemat konfiguratsiooni
    for (const config of smtpConfigs) {
      try {
        console.log(`🔌 Proovin SMTP ühendust: ${config.host}:${config.port} (secure: ${config.secure})`)
        transporter = nodemailer.createTransport(config)
        
        // Testi ühendust
        await transporter.verify()
        console.log(`✅ SMTP ühendus edukas: ${config.host}:${config.port}`)
        break
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Tundmatu viga'
        console.log(`❌ SMTP ühendus ebaõnnestus ${config.host}:${config.port}:`, errorMessage)
        lastError = error
        transporter = null
      }
    }

    if (!transporter) {
      const lastErrorMessage = lastError instanceof Error ? lastError.message : 'Tundmatu viga'
      throw new Error(`Kõik SMTP ühendused ebaõnnestusid. Viimane viga: ${lastErrorMessage}`)
    }

    // E-kirja sisu
    const mailOptions = {
      from: process.env.SMTP_USER || 'no-reply@wecoldcall.com',
      to: process.env.NOTIFICATION_EMAIL || 'no-reply@wecoldcall.com',
      subject: 'Uus kasutaja registreerus - WeColdCall',
      html: `
        <div style="font-family: 'Source Sans Pro', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #253053; font-size: 24px; margin: 0;">WeColdCall</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #0D8BFF;">
            <h2 style="color: #253053; margin-top: 0;">Uus kasutaja registreerus</h2>
            
            <div style="margin: 15px 0;">
              <strong style="color: #253053;">Nimi:</strong> ${firstName} ${lastName}
            </div>
            
            <div style="margin: 15px 0;">
              <strong style="color: #253053;">E-post:</strong> ${email}
            </div>
            
            <div style="margin: 15px 0;">
              <strong style="color: #253053;">Registreerimise aeg:</strong> ${new Date().toLocaleString('et-EE', {
                timeZone: 'Europe/Tallinn',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; color: #636B83; font-size: 14px;">
            See e-kiri saadeti automaatselt WeColdCall süsteemist.
          </div>
        </div>
      `,
      text: `
        Uus kasutaja registreerus WeColdCall'is
        
        Nimi: ${firstName} ${lastName}
        E-post: ${email}
        Registreerimise aeg: ${new Date().toLocaleString('et-EE', {
          timeZone: 'Europe/Tallinn'
        })}
      `
    }

    // Saada e-kiri
    await transporter.sendMail(mailOptions)

    console.log('📧 Uue kasutaja teavituse e-kiri saadetud:', email)

    return NextResponse.json({ 
      success: true, 
      message: 'Teavituse e-kiri saadetud' 
    })

  } catch (error) {
    console.error('❌ Viga e-kirja saatmisel:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'E-kirja saatmine ebaõnnestus' 
      },
      { status: 500 }
    )
  }
}
