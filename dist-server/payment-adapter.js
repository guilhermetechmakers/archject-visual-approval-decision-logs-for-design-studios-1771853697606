/**
 * Payment Provider Adapter
 *
 * Abstract interface for payment providers (Stripe, Chargebee, Braintree, etc.).
 * Implement mock adapter for development and Stripe-like adapter for production.
 */
/** Mock adapter for development - no real payment processing */
export const mockPaymentAdapter = {
    async createPaymentMethod(token) {
        if (!token.startsWith('pm_mock_')) {
            throw new Error('Invalid mock token');
        }
        return {
            id: `pm_${Date.now()}`,
            brand: 'Visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2026,
        };
    },
    async attachPaymentMethodToCustomer() {
        // no-op
    },
    async detachPaymentMethod() {
        // no-op
    },
    async listPaymentMethods() {
        return [];
    },
    async createSubscription() {
        return {
            id: `sub_${Date.now()}`,
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
    },
    async updateSubscription() {
        return {
            id: 'sub_mock',
            status: 'active',
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
    },
    async cancelSubscription() {
        // no-op
    },
    async listInvoices() {
        return [
            {
                id: 'inv_1',
                number: 'INV-2025-001',
                amountDue: 2900,
                amountPaid: 2900,
                currency: 'USD',
                status: 'paid',
                lineItems: [{ description: 'Pro Plan - 5 seats', quantity: 1, unitAmountCents: 2900 }],
            },
        ];
    },
    async getInvoicePdf() {
        return null;
    },
    async applyCoupon() {
        return { percentOff: 10 };
    },
    verifyWebhookSignature() {
        return true;
    },
};
const USE_MOCK = process.env.PAYMENT_PROVIDER === 'mock' || !process.env.STRIPE_SECRET_KEY;
export function getPaymentAdapter() {
    return USE_MOCK ? mockPaymentAdapter : mockPaymentAdapter;
}
