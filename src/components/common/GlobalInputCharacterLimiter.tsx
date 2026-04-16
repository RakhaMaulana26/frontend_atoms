import { useEffect } from 'react';

type TrackableField = HTMLInputElement | HTMLTextAreaElement;

const INPUT_DEFAULT_LIMITS: Record<string, number> = {
  text: 255,
  search: 255,
  email: 254,
  password: 128,
  tel: 20,
  url: 500,
};

const TEXTAREA_DEFAULT_LIMIT = 500;

const isTrackableField = (target: EventTarget | null): target is TrackableField => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly && target.dataset.charLimitOff !== 'true';
  }

  if (!(target instanceof HTMLInputElement)) return false;
  if (target.disabled || target.readOnly || target.dataset.charLimitOff === 'true') return false;

  const type = (target.type || 'text').toLowerCase();
  return ['text', 'search', 'email', 'password', 'tel', 'url'].includes(type);
};

const resolveLimit = (field: TrackableField): number => {
  const explicitLimit = field.dataset.charLimit;
  if (explicitLimit && !Number.isNaN(Number(explicitLimit))) {
    return Number(explicitLimit);
  }

  if (field.maxLength && field.maxLength > 0) {
    return field.maxLength;
  }

  if (field instanceof HTMLTextAreaElement) {
    return TEXTAREA_DEFAULT_LIMIT;
  }

  const inputType = (field.type || 'text').toLowerCase();
  return INPUT_DEFAULT_LIMITS[inputType] || INPUT_DEFAULT_LIMITS.text;
};

const GlobalInputCharacterLimiter = () => {
  useEffect(() => {
    const indicator = document.createElement('div');
    indicator.setAttribute('data-char-indicator', 'true');
    indicator.style.position = 'fixed';
    indicator.style.zIndex = '9999';
    indicator.style.pointerEvents = 'none';
    indicator.style.padding = '2px 8px';
    indicator.style.borderRadius = '999px';
    indicator.style.fontSize = '12px';
    indicator.style.fontWeight = '600';
    indicator.style.lineHeight = '16px';
    indicator.style.background = 'rgba(34,46,106,0.92)';
    indicator.style.color = '#ffffff';
    indicator.style.boxShadow = '0 2px 8px rgba(15,23,42,0.2)';
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 120ms ease';
    document.body.appendChild(indicator);

    let activeField: TrackableField | null = null;

    const setIndicatorVisible = (visible: boolean) => {
      indicator.style.opacity = visible ? '1' : '0';
    };

    const updateIndicatorPosition = () => {
      if (!activeField) return;
      const rect = activeField.getBoundingClientRect();

      indicator.style.left = '0px';
      indicator.style.top = '0px';

      const width = indicator.offsetWidth || 64;
      const height = indicator.offsetHeight || 20;

      let left = rect.right - width;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

      let top = rect.bottom + 6;
      if (top + height > window.innerHeight - 8) {
        top = rect.top - height - 6;
      }

      indicator.style.left = `${left}px`;
      indicator.style.top = `${Math.max(8, top)}px`;
    };

    const updateIndicator = (field: TrackableField) => {
      const limit = resolveLimit(field);

      if (!field.maxLength || field.maxLength <= 0) {
        field.maxLength = limit;
      }

      const currentLength = field.value?.length ?? 0;
      const ratio = limit > 0 ? currentLength / limit : 0;

      indicator.textContent = `${currentLength}/${limit}`;
      indicator.style.background = ratio >= 0.95
        ? 'rgba(185,28,28,0.95)'
        : ratio >= 0.8
          ? 'rgba(180,83,9,0.95)'
          : 'rgba(34,46,106,0.92)';

      updateIndicatorPosition();
      setIndicatorVisible(true);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isTrackableField(event.target)) {
        activeField = null;
        setIndicatorVisible(false);
        return;
      }

      activeField = event.target;
      updateIndicator(activeField);
    };

    const onInput = (event: Event) => {
      if (!activeField || event.target !== activeField) return;
      updateIndicator(activeField);
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        const focusedElement = document.activeElement;
        if (!isTrackableField(focusedElement)) {
          activeField = null;
          setIndicatorVisible(false);
          return;
        }

        activeField = focusedElement;
        updateIndicator(activeField);
      }, 0);
    };

    const onViewportChange = () => {
      if (activeField) {
        updateIndicator(activeField);
      }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('input', onInput, true);
    document.addEventListener('focusout', onFocusOut, true);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('focusout', onFocusOut, true);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      document.body.removeChild(indicator);
    };
  }, []);

  return null;
};

export default GlobalInputCharacterLimiter;
