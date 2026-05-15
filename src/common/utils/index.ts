// Helper function to sleep for a specified number of milliseconds
export const sleep = ( ms: number ): Promise< void > => new Promise( resolve => setTimeout( resolve, ms ) )

export const formatElapsed = ( ms: number ): string => {
  const totalSeconds = Math.floor( ms / 1000 )
  const minutes = Math.floor( totalSeconds / 60 )
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${ minutes }m ${ seconds }s` : `${ seconds }s`
}