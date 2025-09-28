import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface CategoryBreakdownProps {
  categories: Record<string, number>
  totalAmount: number
}

export default function CategoryBreakdown({ categories, totalAmount }: CategoryBreakdownProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Food & Dining":
        return "restaurant-outline"
      case "Shopping":
        return "bag-outline"
      case "Transport":
        return "car-outline"
      case "Bills & Utilities":
        return "receipt-outline"
      case "Entertainment":
        return "game-controller-outline"
      case "Health":
        return "medical-outline"
      default:
        return "ellipse-outline"
    }
  }

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

  const sortedCategories = Object.entries(categories).sort(([, a], [, b]) => b - a)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending Breakdown</Text>
      <View style={styles.categoriesList}>
        {sortedCategories.map(([category, amount]) => {
          const percentage = ((amount / totalAmount) * 100).toFixed(1)
          return (
            <View key={category} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: `${getCategoryColor(category)}15` }]}>
                  <Ionicons name={getCategoryIcon(category) as any} size={16} color={getCategoryColor(category)} />
                </View>
                <Text style={styles.categoryName}>{category}</Text>
                <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${percentage}%`,
                      backgroundColor: getCategoryColor(category),
                    },
                  ]}
                />
              </View>
              <Text style={styles.categoryPercentage}>{percentage}% of total spending</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  categoriesList: {
    gap: 16,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#64748b",
  },
})
