declare module "razorpay" {
  type RazorpayOptions = {
    key_id: string;
    key_secret: string;
  };

  export default class Razorpay {
    constructor(options: RazorpayOptions);
    orders: {
      create(options: Record<string, unknown>): Promise<Record<string, any>>;
    };
    payments: {
      fetch(paymentId: string): Promise<Record<string, any>>;
    };
  }
}
