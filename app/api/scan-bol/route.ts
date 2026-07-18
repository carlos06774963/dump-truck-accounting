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

    // Strip anything that's not valid base64
    const clean = imageBase64.replace(/[^A-Za-z0-9+/=]/g, '')

    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: clean },
          },
          {
            type: 'text',
            text: `Extract all information from this Bill of Lading and return ONLY a JSON object with these fields (no markdown, no explanation):
{"bill_no":"","date":"","principal_carrier_name":"","underlying_carrier":"","job_no":"","truck_no":"","trailer_no":"","broker_no":"","ca_no":"","shipper":"","shipper_address":"","receiver":"","receiver_address":"","point_of_origin":"","point_of_destination":"","equipment_type":"","billing_method":"","rate":0,"total_charges":0,"loads":[{"row_number":1,"tag_no":"","weight":"","commodity":"","loading_arrive":"","loading_depart":"","unloading_arrive":"","unloading_depart":"","standby_time":"","breakdown_reason":""}]}`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not read the image' }, { status: 500 })
    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
