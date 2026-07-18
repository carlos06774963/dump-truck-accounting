export type Customer = {
  id: string
  name: string
  address: string
  city_state_zip: string
  phone: string
  created_at: string
}

export type BillOfLading = {
  id: string
  bill_no: string
  date: string
  principal_carrier_id: string
  principal_carrier_name: string
  underlying_carrier: string
  underlying_address: string
  underlying_phone: string
  job_no: string
  broker_no: string
  truck_no: string
  trailer_no: string
  ca_no: string
  shipper: string
  shipper_address: string
  shipper_city_state_zip: string
  receiver: string
  receiver_address: string
  receiver_city_state_zip: string
  point_of_origin: string
  point_of_destination: string
  equipment_type: string
  billing_method: string
  rate: number
  reporting_time: string
  ending_time: string
  total_time: string
  deductible_time: string
  net_time: string
  total_tons: string
  accessorial_other: number
  total_charges: number
  notes: string
  status: 'draft' | 'submitted' | 'paid'
  created_at: string
}

export type BolLoad = {
  id: string
  bol_id: string
  row_number: number
  tag_no: string
  weight: string
  commodity: string
  loading_arrive: string
  loading_depart: string
  unloading_arrive: string
  unloading_depart: string
  standby_time: string
  breakdown_reason: string
}

export type Expense = {
  id: string
  date: string
  category: string
  description: string
  amount: number
  truck_no: string
  created_at: string
}
