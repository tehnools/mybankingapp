import { View, Text, StyleSheet, Dimensions } from "react-native"
import { VictoryChart, VictoryAxis, VictoryArea } from "victory-native"

const { width: screenWidth } = Dimensions.get("window")

interface SpendingChartProps {
  data: Array<{ x: string; y: number }>
  title: string
  color?: string
}

export default function SpendingChart({ data, title, color = "#3b82f6" }: SpendingChartProps) {
  const chartWidth = screenWidth - 80

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <VictoryChart width={chartWidth} height={200} padding={{ left: 60, top: 20, right: 40, bottom: 40 }}>
        <VictoryAxis
          dependentAxis
          tickFormat={(x) => `$${x}`}
          style={{ tickLabels: { fontSize: 12, fill: "#64748b" } }}
        />
        <VictoryAxis style={{ tickLabels: { fontSize: 12, fill: "#64748b" } }} />
        <VictoryArea
          data={data}
          style={{
            data: { fill: color, fillOpacity: 0.1, stroke: color, strokeWidth: 2 },
          }}
          animate={{
            duration: 1000,
            onLoad: { duration: 500 },
          }}
        />
      </VictoryChart>
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
})
