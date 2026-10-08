/** Token warna gaya shadcn: nilai diisi dari tema aktif lewat CSS variable "r g b". */
const c = n => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ["./index.html", "./admin.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: c("background"), foreground: c("foreground"),
        card: { DEFAULT: c("card"), foreground: c("card-foreground") },
        primary: { DEFAULT: c("primary"), foreground: c("primary-foreground") },
        muted: { DEFAULT: c("muted"), foreground: c("muted-foreground") },
        border: c("border"), ring: c("ring"),
        glow: c("glow"), headfrom: c("head-from"), headto: c("head-to")
      },
      borderRadius: { xl: "var(--radius)", lg: "calc(var(--radius) * .75)", md: "calc(var(--radius) * .5)" },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-body)"]
      },
      keyframes: {
        aurora: { from: { backgroundPosition: "50% 50%, 50% 50%" }, to: { backgroundPosition: "350% 50%, 350% 50%" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(calc(-100% - var(--gap)))" } },
        "shimmer-slide": { to: { transform: "translate(calc(100cqw - 100%), 0)" } },
        "spin-around": { "0%": { transform: "translateZ(0) rotate(0)" }, "15%, 35%": { transform: "translateZ(0) rotate(90deg)" }, "65%, 85%": { transform: "translateZ(0) rotate(270deg)" }, "100%": { transform: "translateZ(0) rotate(360deg)" } },
        "border-beam": { "100%": { offsetDistance: "100%" } }
      },
      animation: {
        aurora: "aurora 60s linear infinite",
        marquee: "marquee var(--duration) linear infinite",
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear"
      }
    }
  },
  plugins: []
};
