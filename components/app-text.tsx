import React from "react"
import { Text as RNText, type TextProps as RNTextProps } from "react-native"

export interface AppTextProps extends RNTextProps {
  /**
   * Prevents single-word orphans on the last line of multi-word sentences/paragraphs
   * by joining the last two words with a non-breaking space (\u00A0) and using
   * balanced line breaking on Android.
   * @default true
   */
  preventOrphans?: boolean
}

const applyNonBreakingLastSpace = (text: string): string => {
  return text
    .split("\n")
    .map((paragraph: string): string => {
      const trimmedRight = paragraph.trimEnd()
      const words = trimmedRight.trim().split(/\s+/)
      // Only join the last two words when the paragraph has 4+ words
      if (words.length < 4) {
        return paragraph
      }
      return paragraph.replace(/\s+(\S+)\s*$/, "\u00A0$1")
    })
    .join("\n")
}

const formatChildrenWithoutOrphans = (children: React.ReactNode): React.ReactNode => {
  if (typeof children === "string") {
    return applyNonBreakingLastSpace(children)
  }

  if (Array.isArray(children)) {
    // Combine adjacent string literals first so multi-line JSX text + {"\n\n"} is processed cleanly
    const merged: React.ReactNode[] = []
    for (const child of children) {
      if (typeof child === "string" && typeof merged[merged.length - 1] === "string") {
        merged[merged.length - 1] = (merged[merged.length - 1] as string) + child
      } else {
        merged.push(child)
      }
    }

    return merged.map((child: React.ReactNode): React.ReactNode =>
      typeof child === "string" ? applyNonBreakingLastSpace(child) : child,
    )
  }

  return children
}

export const Text = ({
  children,
  preventOrphans = true,
  textBreakStrategy = "balanced",
  ...props
}: AppTextProps): React.JSX.Element => {
  const formattedChildren = preventOrphans ? formatChildrenWithoutOrphans(children) : children

  return (
    <RNText textBreakStrategy={textBreakStrategy} {...props}>
      {formattedChildren}
    </RNText>
  )
}

export default Text
