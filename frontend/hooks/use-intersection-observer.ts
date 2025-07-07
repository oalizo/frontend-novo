import { useEffect, RefObject } from 'react'

export function useIntersectionObserver(
  ref: RefObject<Element>,
  callback: () => void,
  options: IntersectionObserverInit = {
    threshold: 0.1,
    root: null,
    rootMargin: '0px'
  }
) {
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback()
      }
    }, options)

    const element = ref.current
    if (element) {
      observer.observe(element)
    }

    return () => {
      if (element) {
        observer.unobserve(element)
      }
    }
  }, [ref, callback, options])
}