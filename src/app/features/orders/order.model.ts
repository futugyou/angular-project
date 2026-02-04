export interface IOrderSearch {
  pageIndex: number
  pageSize: number
  userName: string
  tels: string
  price: string
  startTime: string
  endTime: string
}

export interface IOrderRow {
  id: string
  orderCode: string
  orderUser: string
  orderTime: string
  orderTel: string
  orderPrice: number
  remark: string
  payName: string
  payClient: string
  status: number
}

export interface IOrderRowDetail {
  index: number
  productName: string
  productCode: string
  count: number
  unitName: string
  price: number
  remark: string
  allPrice: number
}
