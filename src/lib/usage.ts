// Rolling monthly usage periods, anchored to each account's usagePeriodStart.
// A period runs from usagePeriodStart up to (but not including) the same
// day-of-month one month later; days past the end of a short month clamp to
// its last day (Jan 31 -> Feb 28/29).

export function addMonths(date:Date, months:number): Date {
  const d = new Date(date.getTime())
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d
}

// Start of the period containing `now`: usagePeriodStart advanced by whole
// months. Returns periodStart unchanged while the current period is still open.
export function currentPeriodStart(periodStart:Date, now:Date): Date {
  let months = (now.getUTCFullYear() - periodStart.getUTCFullYear()) * 12 + (now.getUTCMonth() - periodStart.getUTCMonth())
  if (months < 0) return periodStart
  while (months > 0 && addMonths(periodStart, months) > now) months--
  return months === 0 ? periodStart : addMonths(periodStart, months)
}

export const isPeriodExpired = (periodStart:Date, now:Date) =>
  currentPeriodStart(periodStart, now).getTime() !== periodStart.getTime()

// Usage to enforce limits against: an expired period counts as zero.
export function effectiveUsage(user:{messagesThisMonth:number,usagePeriodStart:Date}, now:Date = new Date()): number {
  return isPeriodExpired(user.usagePeriodStart, now) ? 0 : user.messagesThisMonth
}

// Counts one send against the user, inside the caller's transaction. If the
// period has expired, the counter restarts (0 + this send = 1) and
// usagePeriodStart moves forward. The reset is conditional on the start date
// we read, so a concurrent send that already reset it falls through to a plain
// increment instead of resetting twice.
export async function recordSend(tx:any, userId:string, now:Date = new Date()) {
  const user = await tx.user.findUnique({where:{id:userId},select:{usagePeriodStart:true}})
  if (user && isPeriodExpired(user.usagePeriodStart, now)) {
    const reset = await tx.user.updateMany({
      where:{id:userId,usagePeriodStart:user.usagePeriodStart},
      data:{messagesThisMonth:1,usagePeriodStart:currentPeriodStart(user.usagePeriodStart, now)}
    })
    if (reset.count > 0) return
  }
  await tx.user.update({where:{id:userId},data:{messagesThisMonth:{increment:1}}})
}
