import ExpoModulesCore
import SwiftUI
import Charts

// A smooth line chart for the habit stats sheet: Swift Charts with a Catmull-Rom curve, a soft
// gradient under it and a few faint horizontal guides. @expo/ui's Chart only draws straight
// segments with a flat fill, so this small view lives here instead.

final class SimulChartProps: ExpoSwiftUI.ViewProps {
  /// One value per point, oldest first.
  @Field var values: [Double] = []
  /// Line colour as `#RRGGBB`.
  @Field var color: String = "#6BB290"
  /// Top of the y axis (the bottom is always 0).
  @Field var maxValue: Double = 1
  /// Draws a dot on the last point.
  @Field var showsLastPoint: Bool = true
}

private extension Color {
  init(hexString: String) {
    var hex = hexString.trimmingCharacters(in: .whitespacesAndNewlines)
    if hex.hasPrefix("#") { hex.removeFirst() }
    var value: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&value)
    self.init(
      .sRGB,
      red: Double((value >> 16) & 0xFF) / 255,
      green: Double((value >> 8) & 0xFF) / 255,
      blue: Double(value & 0xFF) / 255,
      opacity: 1
    )
  }
}

struct SimulChartView: ExpoSwiftUI.View {
  @ObservedObject var props: SimulChartProps

  init(props: SimulChartProps) {
    self.props = props
  }

  var body: some View {
    let color = Color(hexString: props.color)
    let points = Array(props.values.enumerated())
    let top = max(props.maxValue, 0.0001)

    Chart {
      ForEach(points, id: \.offset) { point in
        AreaMark(x: .value("Day", point.offset), y: .value("Value", point.element))
          .interpolationMethod(.catmullRom)
          .foregroundStyle(
            LinearGradient(
              colors: [color.opacity(0.32), color.opacity(0.02)],
              startPoint: .top,
              endPoint: .bottom
            )
          )
        LineMark(x: .value("Day", point.offset), y: .value("Value", point.element))
          .interpolationMethod(.catmullRom)
          .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
          .foregroundStyle(color)
      }
      if props.showsLastPoint, let last = points.last {
        PointMark(x: .value("Day", last.offset), y: .value("Value", last.element))
          .symbolSize(70)
          .foregroundStyle(color)
      }
    }
    .chartXAxis(.hidden)
    .chartYScale(domain: 0...top)
    .chartYAxis {
      AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { _ in
        AxisGridLine(stroke: StrokeStyle(lineWidth: 0.6, dash: [3, 4]))
          .foregroundStyle(Color.secondary.opacity(0.25))
      }
    }
    .chartLegend(.hidden)
    .animation(.easeInOut(duration: 0.4), value: props.values)
  }
}

public class SimulChartModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SimulChart")

    View(SimulChartView.self)
  }
}
