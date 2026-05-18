import { useState, useEffect } from 'react'

export function useMobile(breakpoint = 700) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [breakpoint])
  return mobile
}
