import { isConnected, requestAccess, signTransaction, setAllowed } from "@stellar/freighter-api";
import { Horizon, TransactionBuilder, Networks, Asset, Operation } from "@stellar/stellar-sdk";

const server = new Horizon.Server("https://horizon-testnet.stellar.org");

/* A typed wallet error so the UI can branch on `code` (e.g. show an install
   modal vs. a "rejected" toast) instead of a generic alert. */
export class WalletError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

/* True only on a touch/mobile browser, where Freighter (a desktop extension)
   cannot run. Used to tailor the "wallet not found" message. */
export const isMobileBrowser = () =>
    typeof navigator !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");

/* Never let a missing extension hang the UI: race detection against a timeout.
   On mobile (no extension) the injected provider never answers. */
const withTimeout = (promise, ms = 3000) =>
    Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve({ isConnected: false }), ms)),
    ]);

/* Whether the Freighter extension is installed & reachable in this browser. */
export const isFreighterInstalled = async () => {
    try {
        const res = await withTimeout(isConnected(), 3000);
        return Boolean(res?.isConnected);
    } catch {
        return false;
    }
};

export const connectWallet = async () => {
    // Gate on detection first so we fail fast with a helpful message instead of
    // an infinite "Connecting..." spinner on devices without the extension.
    const installed = await isFreighterInstalled();
    if (!installed) {
        throw new WalletError(
            "NotInstalled",
            isMobileBrowser()
                ? "Freighter is a desktop browser extension and isn't available on mobile. Open StellarFlow on a computer using Chrome, Brave, Firefox, or Edge with Freighter installed."
                : "Freighter wallet not detected. Install the Freighter browser extension, switch it to Testnet, then try again."
        );
    }

    try {
        await setAllowed();
        const { address, error } = await requestAccess();
        if (error) {
            throw new WalletError("Rejected", error.message || "Connection request was rejected in Freighter.");
        }
        if (!address) {
            throw new WalletError("NoAddress", "Freighter did not return an address. Unlock the wallet and try again.");
        }
        return address;
    } catch (e) {
        if (e instanceof WalletError) throw e;
        throw new WalletError("ConnectFailed", e?.message || "Failed to connect to Freighter.");
    }
};

export const fetchBalance = async (publicKey) => {
    try {
        const account = await server.loadAccount(publicKey);
        const nativeBalance = account.balances.find((b) => b.asset_type === "native");
        return nativeBalance ? nativeBalance.balance : "0";
    } catch (error) {
        console.error("Error fetching balance:", error);
        throw new Error("Could not fetch balance");
    }
};

export const sendPayment = async (sender, recipient, amount) => {
    try {
        const account = await server.loadAccount(sender);
        const fee = await server.fetchBaseFee();

        const transaction = new TransactionBuilder(account, {
            fee,
            networkPassphrase: Networks.TESTNET,
        })
            .addOperation(
                Operation.payment({
                    destination: recipient,
                    asset: Asset.native(),
                    amount: amount.toString(),
                })
            )
            .setTimeout(30)
            .build();

        // Sign the transaction with Freighter
        const { signedTxXdr, error: signError } = await signTransaction(transaction.toXDR(), {
            networkPassphrase: Networks.TESTNET,
        });

        if (signError) {
            throw new Error(signError.message || "Transaction signing failed");
        }

        // Submit the transaction
        const tx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
        const result = await server.submitTransaction(tx);
        return result.hash;
    } catch (error) {
        console.error("Error sending payment:", error);

        // Surface Horizon result_codes if available
        const extras = error?.response?.data?.extras;
        if (extras?.result_codes) {
            const codes = Object.values(extras.result_codes).flat().join(', ');
            throw new Error(`Transaction rejected: ${codes}`);
        }

        // Re-throw whatever message we already have
        throw error instanceof Error ? error : new Error(String(error));
    }
};

export const fetchPayments = async (publicKey) => {
    try {
        const paymentsResponse = await server.payments()
            .forAccount(publicKey)
            .order("desc")
            .limit(10)
            .call();
        return paymentsResponse.records;
    } catch (error) {
        console.error("Error fetching payments:", error);
        throw error;
    }
};