import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) return NextResponse.json({ error: 'No image URL' }, { status: 400 })

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: 'Extract information from this receipt or invoice and return ONLY a JSON object (no markdown): {"date":"YYYY-MM-DD","description":"short description","amount":0.00,"category":"one of: Fuel, Parts, Mechanic, Maintenance, Tires, Insurance, Registration, Tolls, Wash, Permits, Materials, Other"}',
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not read the receipt' }, { status: 500 })
    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
