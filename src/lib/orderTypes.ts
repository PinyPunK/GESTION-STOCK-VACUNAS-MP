export type VaccineOrder={id:string;number:string;date:string;status:string;professional:string};
export type OrderLine={id:string;orderId:string;code:string;sivac:string;name:string;quantity:number;received:number};
export type OrderReceipt={id:string;orderId:string;orderNumber:string;date:string;deliveryNote:string;code:string;sivac:string;name:string;lot:string;expiry:string;quantity:number;warehouse:string;professional:string};
