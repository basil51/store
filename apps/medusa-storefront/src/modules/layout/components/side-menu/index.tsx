"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { Text, clx, useToggleState } from "@medusajs/ui"
import { Fragment } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { HttpTypes } from "@medusajs/types"
import { Locale } from "@lib/data/locales"

const SideMenuItems = {
  Home: "/",
  Store: "/store",
  Account: "/account",
  Cart: "/cart",
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
}

const SideMenu = ({ regions, locales, currentLocale }: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex h-full items-center">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full items-center">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative flex items-center rounded-full border border-[#08111f14] bg-white/72 px-4 py-2 text-sm font-semibold text-[#08111f] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white focus:outline-none"
                >
                  Menu
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-[#08111f]/25 backdrop-blur-sm"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <PopoverPanel className="absolute inset-x-0 z-[51] m-2 flex h-[calc(100vh-1rem)] w-full flex-col [padding-inline-end:1rem] text-sm text-ui-fg-on-color sm:min-w-min sm:w-1/3 sm:[padding-inline-end:0] 2xl:w-1/4">
                  <div
                    data-testid="nav-menu-popup"
                    className="tech-dark-panel flex h-full flex-col justify-between p-7"
                  >
                    <div className="flex justify-end" id="xmark">
                      <button
                        data-testid="close-menu-button"
                        onClick={close}
                        className="rounded-full border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
                      >
                        <XMark />
                      </button>
                    </div>
                    <div className="space-y-8">
                      <div className="space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                          Tech Store
                        </p>
                        <p className="max-w-xs text-sm leading-6 text-white/72">
                          Explore mobiles, laptops, monitors, gaming parts,
                          software, audio, and the accessories that complete the
                          setup.
                        </p>
                      </div>

                      <ul className="flex flex-col items-start justify-start gap-5">
                        {Object.entries(SideMenuItems).map(([name, href]) => {
                          return (
                            <li key={name}>
                              <LocalizedClientLink
                                href={href}
                                className="text-3xl font-semibold leading-10 tracking-[-0.04em] text-white transition-colors hover:text-white/60"
                                onClick={close}
                                data-testid={`${name.toLowerCase()}-link`}
                              >
                                {name}
                              </LocalizedClientLink>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-y-6">
                      {!!locales?.length && (
                        <div
                          className="flex justify-between rounded-[20px] border border-white/10 bg-white/5 px-4 py-3"
                          onMouseEnter={languageToggleState.open}
                          onMouseLeave={languageToggleState.close}
                        >
                          <LanguageSelect
                            toggleState={languageToggleState}
                            locales={locales}
                            currentLocale={currentLocale}
                          />
                          <ArrowRightMini
                            className={clx(
                              "transition-transform duration-150",
                              languageToggleState.state ? "-rotate-90" : ""
                            )}
                          />
                        </div>
                      )}
                      <div
                        className="flex justify-between rounded-[20px] border border-white/10 bg-white/5 px-4 py-3"
                        onMouseEnter={countryToggleState.open}
                        onMouseLeave={countryToggleState.close}
                      >
                        {regions && (
                          <CountrySelect
                            toggleState={countryToggleState}
                            regions={regions}
                          />
                        )}
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150",
                            countryToggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                      <Text className="flex justify-between txt-compact-small text-white/55">
                        © {new Date().getFullYear()} Tech Store. All rights
                        reserved.
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
