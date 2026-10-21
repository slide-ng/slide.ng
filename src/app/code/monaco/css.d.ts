// A stylesheet imported `with { loader: 'text' }` is its text (Angular's build inlines it into the importing chunk).
declare module '*.css' {
  const text: string;
  export default text;
}
