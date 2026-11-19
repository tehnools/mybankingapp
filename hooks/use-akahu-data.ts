import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { akahuClient, type AkahuRawAccount } from "../lib/akahu-client"
import type { BankAccount } from "../lib/store"

function mapAkahuAccountType(rawType?: string): BankAccount["type"] {
  switch (rawType?.toUpperCase()) {
    case "CREDITCARD":
    case "CREDIT_CARD":
      return "credit"
    case "SAVINGS":
    case "TERMDEPOSIT":
      return "savings"
    case "KIWISAVER":
      return "kiwisaver"
    case "INVESTMENT":
      return "investment"
    case "LOAN":
    case "MORTGAGE":
      return "loan"
    default:
      return "checking"
  }
}

export function useAkahuConnection() {
  return useQuery({
    queryKey: ["akahu", "connection"],
    queryFn: async () => {
      try {
        await akahuClient.initialize()
        const { appToken, accessToken } = await akahuClient.getStoredCredentials()
        if (!appToken || !accessToken) {
          return { connected: false, user: null }
        }
        const me = await akahuClient.getMe()
        return { connected: !!me?.item, user: me?.item || null }
      } catch (error) {
        return { connected: false, user: null }
      }
    },
    retry: false,
  })
}

export function useAkahuAccounts() {
  const { data: connection } = useAkahuConnection()

  return useQuery({
    queryKey: ["akahu", "accounts"],
    queryFn: async () => {
      const response = await akahuClient.getAccounts()

      const accounts: BankAccount[] =
        response.items?.map((account: AkahuRawAccount) => ({
          id: account._id,
          name: account.name,
          bank: account.connection?.name || "NZ Bank",
          accountNumber: account.formatted_account || "••••",
          balance: account.balance?.current ?? 0,
          availableBalance: account.balance?.available,
          type: mapAkahuAccountType(account.type),
          status: account.status,
          lastRefreshed: account.refreshed?.balance || account.refreshed?.transactions,
        })) || []

      return accounts
    },
    enabled: !!connection?.connected,
  })
}

export function useRefreshAkahu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountOrConnectionId?: string) => {
      return await akahuClient.refreshAccounts(accountOrConnectionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akahu", "accounts"] })
    },
  })
}
