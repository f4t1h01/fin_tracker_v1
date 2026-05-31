export function buildDuetEmailTemplate(input: {
  eyebrow: string;
  title: string;
  message: string;
  code?: string;
  footer?: string;
}) {
  const codeBlock = input.code
    ? `<div style="margin:24px 0 18px;padding:18px 20px;border-radius:18px;background:#f7efd9;border:1px solid #dec46d;text-align:center;">
        <div style="font-size:32px;line-height:1;letter-spacing:8px;font-weight:700;color:#201815;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${input.code}</div>
      </div>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4efe6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#201815;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4efe6;padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fffaf1;border:1px solid #eadfca;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 30px 8px;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1;color:#201815;">Duet</div>
                <div style="margin-top:18px;text-transform:uppercase;letter-spacing:2px;font-size:11px;color:#987b2e;">${input.eyebrow}</div>
                <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;font-weight:650;color:#201815;">${input.title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 30px 30px;">
                <p style="margin:0;font-size:15px;line-height:1.65;color:#5d514a;">${input.message}</p>
                ${codeBlock}
                ${input.footer ? `<p style="margin:18px 0 0;font-size:13px;line-height:1.55;color:#82746b;">${input.footer}</p>` : ""}
              </td>
            </tr>
          </table>
          <p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#8c8179;">This message was sent by Duet. If you did not request it, you can ignore it.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
