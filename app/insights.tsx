"use client"

import { useState } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { VictoryChart, VictoryPie, VictoryBar, VictoryAxis, VictoryArea } from "victory-native"
import { useAkahuTransactions, useAkahuConnection } from "../hooks/use-akahu-data"
import { calculateTransactionSummary } from "../lib/transaction-utils"
import type { Transaction } from "../lib/store"

const { width: screenWidth } = Dimensions.get("window")
const chartWidth = screenWidth - 40

const TIME_PERIODS = ["7D", "30D", "90D", "1Y"]

export default function InsightsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState("30D")
  const { data: connectionStatus } = useAkahuConnection()
  const { data: transactions } = useAkahuTransactions(undefined, 30)

  // Mock data for demonstration
  const mockTransactions: Transaction[] = [
    {
      id: "1",
      accountId: "acc1",
      amount: 45.5,
      description: "Countdown Supermarket",
      category: "Food & Dining",
      date: "2024-01-15",
      type: "debit",
    },
    {
      id: "2",
      accountId: "acc2",
      amount: 2500.0,
      description: "Salary Payment",
      category: "Income",
      date: "2024-01-14",
      type: "credit",
    },
    {
      id: "3",
      accountId: "acc1",
      amount: 89.99,
      description: "Spark Mobile",
      category: "Bills & Utilities",
      date: "2024-01-13",
      type: "debit",
    },
    {
      id: "4",
      accountId: "acc3",
      amount: 25.0,
      description: "Netflix Subscription",
      category: "Entertainment",
      date: "2024-01-12",
      type: "debit",
    },
    {
      id: "5",
      accountId: "acc1",
      amount: 156.75,
      description: "Pak'nSave Groceries",
      category: "Food & Dining",
      date: "2024-01-11",
      type: "debit",
    },
    {
      id: "6",
      accountId: "acc1",
      amount: 75.0,
      description: "Z Energy",
      category: "Transport",
      date: "2024-01-10",
      type: "debit",
    },
    {
      id: "7",
      accountId: "acc2",
      amount: 120.0,
      description: "Warehouse Stationery",
      category: "Shopping",
      date: "2024-01-09",
      type: "debit",
    },
  ]

  const allTransactions = transactions || mockTransactions
  const summary = calculateTransactionSummary(allTransactions)

  // Prepare data for charts
  const categoryData = Object.entries(summary.categoryBreakdown).map(([category, amount]) => ({
    x: category,
    y: amount,
  }))

  const spendingTrendData = [
    { x: "Week 1", y: 450 },
    { x: "Week 2", y: 380 },
    { x: "Week 3", y: 520 },
    { x: "Week 4", y: 290 },
  ]

  const monthlyComparisonData = [
    { month: "Nov", income: 3200, expenses: 2100 },
    { month: "Dec", income: 3500, expenses: 2800 },
    { month: "Jan", income: 3200, expenses: 1950 },
  ]

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Food & Dining": "#f59e0b",
      Shopping: "#8b5cf6",
      Transport: "#06b6d4",
      "Bills & Utilities": "#ef4444",
      Entertainment: "#ec4899",
      Health: "#10b981",
      Other: "#64748b",
    }
    return colors[category] || "#64748b"
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-NZ", {
      style: "currency",
      currency: "NZD",
      minimumFractionDigits: 0,
    })
  }

  if (!connectionStatus?.connected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notConnectedContainer}>
          <Ionicons name="analytics-outline" size={64} color="#9ca3af" />
          <Text style={styles.notConnectedTitle}>No Data Available</Text>
          <Text style={styles.notConnectedText}>Connect your bank accounts to view financial insights</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Financial Insights</Text>
          <Text style={styles.subtitle}>Understand your spending patterns</Text>
        </View>

        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {TIME_PERIODS.map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.activePeriodButton]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.activePeriodButtonText]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-up" size={20} color="#059669" />
              <Text style={styles.summaryLabel}>Total Income</Text>
            </View>
            <Text style={styles.summaryAmount}>{formatCurrency(summary.totalIncome)}</Text>
            <Text style={styles.summaryChange}>+12% from last month</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-down" size={20} color="#dc2626" />
              <Text style={styles.summaryLabel}>Total Expenses</Text>
            </View>
            <Text style={styles.summaryAmount}>{formatCurrency(summary.totalExpenses)}</Text>
            <Text style={styles.summaryChange}>-8% from last month</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="wallet" size={20} color="#3b82f6" />
              <Text style={styles.summaryLabel}>Net Savings</Text>
            </View>
            <Text style={styles.summaryAmount}>{formatCurrency(summary.netAmount)}</Text>
            <Text style={styles.summaryChange}>+25% from last month</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="calendar" size={20} color="#f59e0b" />
              <Text style={styles.summaryLabel}>Daily Average</Text>
            </View>
            <Text style={styles.summaryAmount}>{formatCurrency(summary.totalExpenses / 30)}</Text>
            <Text style={styles.summaryChange}>Based on 30 days</Text>
          </View>
        </View>

        {/* Spending by Category Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          <View style={styles.pieChartContainer}>
            <VictoryPie
              data={categoryData}
              width={chartWidth}
              height={200}
              innerRadius={50}
              colorScale={categoryData.map((item) => getCategoryColor(item.x))}
              labelComponent={<></>}
            />
          </View>
          <View style={styles.legendContainer}>
            {categoryData.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: getCategoryColor(item.x) }]} />
                <Text style={styles.legendText}>{item.x}</Text>
                <Text style={styles.legendAmount}>{formatCurrency(item.y)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Spending Trend Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Spending Trend</Text>
          <VictoryChart width={chartWidth} height={200} padding={{ left: 60, top: 20, right: 40, bottom: 40 }}>
            <VictoryAxis
              dependentAxis
              tickFormat={(x) => `$${x}`}
              style={{ tickLabels: { fontSize: 12, fill: "#64748b" } }}
            />
            <VictoryAxis style={{ tickLabels: { fontSize: 12, fill: "#64748b" } }} />
            <VictoryArea
              data={spendingTrendData}
              style={{
                data: { fill: "#3b82f6", fillOpacity: 0.1, stroke: "#3b82f6", strokeWidth: 2 },
              }}
            />
          </VictoryChart>
        </View>

        {/* Monthly Comparison Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Income vs Expenses</Text>
          <VictoryChart width={chartWidth} height={200} padding={{ left: 60, top: 20, right: 40, bottom: 40 }}>
            <VictoryAxis
              dependentAxis
              tickFormat={(x) => `$${x}`}
              style={{ tickLabels: { fontSize: 12, fill: "#64748b" } }}
            />
            <VictoryAxis style={{ tickLabels: { fontSize: 12, fill: "#64748b" } }} />
            <VictoryBar
              data={monthlyComparisonData.map((d) => ({ x: d.month, y: d.income }))}
              style={{ data: { fill: "#059669" } }}
            />
            <VictoryBar
              data={monthlyComparisonData.map((d) => ({ x: d.month, y: d.expenses }))}
              style={{ data: { fill: "#dc2626" } }}
            />
          </VictoryChart>
          <View style={styles.chartLegend}>
            <View style={styles.chartLegendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#059669" }]} />
              <Text style={styles.legendText}>Income</Text>
            </View>
            <View style={styles.chartLegendItem}>
              <View style={[styles.legendColor, { backgroundColor: "#dc2626" }]} />
              <Text style={styles.legendText}>Expenses</Text>
            </View>
          </View>
        </View>

        {/* Financial Health Score */}
        <View style={styles.healthScoreContainer}>
          <Text style={styles.chartTitle}>Financial Health Score</Text>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreNumber}>78</Text>
            <Text style={styles.scoreLabel}>Good</Text>
          </View>
          <View style={styles.healthTips}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.tipText}>You're saving 39% of your income</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="information-circle" size={16} color="#f59e0b" />
              <Text style={styles.tipText}>Consider reducing dining out expenses</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="trending-up" size={16} color="#3b82f6" />
              <Text style={styles.tipText}>Your savings rate is improving</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  activePeriodButton: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  activePeriodButtonText: {
    color: "#1e293b",
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    width: (screenWidth - 52) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  summaryChange: {
    fontSize: 12,
    color: "#059669",
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  pieChartContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  legendContainer: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
    color: "#64748b",
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 12,
  },
  chartLegendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  healthScoreContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0fdf4",
    borderWidth: 8,
    borderColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  scoreNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#059669",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
  },
  healthTips: {
    width: "100%",
    gap: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  tipText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 8,
    flex: 1,
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  notConnectedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  notConnectedText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
})
