import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/Motion/Reveal";
import { FAQS } from "@/lib/content/marketing";

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <Reveal className="text-center">
        <p className="text-sm font-medium text-violet-600">SSS</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Sıkça sorulan sorular</h2>
      </Reveal>

      <Reveal delay={0.1} className="mt-10">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="rounded-2xl border border-border/70 bg-card px-5 py-1 shadow-sm mb-3">
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
