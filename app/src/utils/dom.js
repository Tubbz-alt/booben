/**
 *
 * @return {boolean}
 */
export const isInputOrTextareaActive = () => {
  const nodeName = document.activeElement.nodeName;
  return nodeName === 'INPUT' || nodeName === 'TEXTAREA';
};

export const preventDefault = event => event.preventDefault();
