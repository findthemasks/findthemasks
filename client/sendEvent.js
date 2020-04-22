// Sends event to gtag for analytics
export default function sendEvent(category, action, label) {
  gtag('event', action, {
    'event_category': category,
    'event_label': label
  });
};
