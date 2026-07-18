import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageBase64 } = body

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'No image data received' }, { status: 400 })
    }

    const clean = imageBase64.replace(/[^A-Za-z0-9+/=]/g, '')

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: clean },
          },
          {
            type: 'text',
            text: `Extract information from this receipt or invoice and return ONLY a JSON object (no markdown):
{"date":"YYYY-MM-DD","description":"short description","amount":0.00,"category":"one of: Fuel, Parts, Mechanic, Maintenance, Tires, Insurance, Registration, Tolls, Wash, Permits, Materials, Other"}
For fuel receipts extract total. For material purchases (gravel, sand, roadbase) use category Materials.`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not read the receipt' }, { status: 500 })
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
