import React, { useEffect, useImperativeHandle, useState } from "react"

import Eye from "@modules/common/icons/eye"
import EyeOff from "@modules/common/icons/eye-off"

type InputProps = Omit<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  "placeholder"
> & {
  label: string
  errors?: Record<string, unknown>
  touched?: Record<string, unknown>
  name: string
  topLabel?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type, name, label, touched, required, topLabel, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [inputType, setInputType] = useState(type)

    useEffect(() => {
      if (type === "password" && showPassword) {
        setInputType("text")
      }

      if (type === "password" && !showPassword) {
        setInputType("password")
      }
    }, [type, showPassword])

    useImperativeHandle(ref, () => inputRef.current!)

    return (
      <div className="flex flex-col w-full">
        {topLabel && (
          <label className="mb-2 text-sm font-medium" style={{ color: "var(--text-dim)" }}>
            {topLabel}
          </label>
        )}
        <div className="flex relative z-0 w-full">
          <input
            type={inputType}
            name={name}
            placeholder=" "
            required={required}
            className="pt-4 pb-1 block w-full h-11 px-4 mt-0 rounded-xl appearance-none focus:outline-none transition-all"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--teal)"
              e.currentTarget.style.boxShadow = "0 0 0 2px rgba(0,229,200,0.15)"
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)"
              e.currentTarget.style.boxShadow = "none"
            }}
            {...props}
            ref={inputRef}
          />
          <label
            htmlFor={name}
            onClick={() => inputRef.current?.focus()}
            className="flex items-center justify-center mx-3 px-1 transition-all absolute duration-300 top-3 -z-1 origin-0 text-sm"
            style={{ color: "var(--text-dim)" }}
          >
            {label}
            {required && <span style={{ color: "var(--coral)" }}>*</span>}
          </label>
          {type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="px-4 focus:outline-none transition-all duration-150 outline-none absolute top-3"
              style={{ color: "var(--text-dim)", insetInlineEnd: 0 }}
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          )}
        </div>
      </div>
    )
  }
)

Input.displayName = "Input"

export default Input
