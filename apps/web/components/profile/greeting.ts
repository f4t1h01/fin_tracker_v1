export function getTashkentGreeting(name?: string | null) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Tashkent"
  });

  const hour = Number(formatter.format(new Date()));

  let prefix = "Good evening";
  if (hour >= 5 && hour < 12) {
    prefix = "Good morning";
  } else if (hour >= 12 && hour < 18) {
    prefix = "Good afternoon";
  } else if (hour >= 18 && hour < 23) {
    prefix = "Good evening";
  } else {
    prefix = "Good night";
  }

  return name ? `${prefix}, ${name}` : prefix;
}
