from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from PIL import Image
import json

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'output/marketing/assets'
SCREENS=ROOT/'output/marketing/screens'
OUT=ROOT/'output/pdf/Dong-Quy-Huong-dan-su-dung.pdf'
pdfmetrics.registerFont(TTFont('Be',str(ASSETS/'BeVietnamPro-Regular.ttf')))
pdfmetrics.registerFont(TTFont('BeBold',str(ASSETS/'BeVietnamPro-Bold.ttf')))
pdfmetrics.registerFontFamily('Be',normal='Be',bold='BeBold',italic='Be',boldItalic='BeBold')
W,H=landscape(A4)
GREEN='#147D65'; NAVY='#123D36'; TEXT='#172E36'; MUTED='#53656F'; LIGHT='#EAF5EF'
pages=json.loads((ROOT/'output/marketing/source/guide_content.json').read_text(encoding='utf8'))
TOTAL=len(pages)+4
OUT.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
c.setTitle('Hướng dẫn sử dụng Đồng Quỹ')
c.setAuthor('Đồng Quỹ')
c.setSubject('Hướng dẫn thao tác với ảnh chụp hệ thống demo tháng 11 năm 2026')
c.setCreator('Đồng Quỹ tài liệu sản phẩm')
layout=[]

def para(text,x,top,w,size=11,leading=16,color=TEXT,bold=False):
    style=ParagraphStyle('body',fontName='BeBold' if bold else 'Be',fontSize=size,leading=leading,textColor=HexColor(color),spaceAfter=0)
    p=Paragraph(text,style);_,h=p.wrap(w,900)
    p.drawOn(c,x,H-top-h)
    return top+h

def text(s,x,top,size=10,color=TEXT,bold=False):
    c.setFillColor(HexColor(color));c.setFont('BeBold' if bold else 'Be',size);c.drawString(x,H-top-size,s)

def photo(name,x,top,w,h,caption=None):
    p=SCREENS/(name+'.png');iw,ih=Image.open(p).size;ratio=min(w/iw,h/ih);dw,dh=iw*ratio,ih*ratio
    dx=x+(w-dw)/2
    c.setStrokeColor(HexColor('#DDE7E3'));c.setLineWidth(.6);c.rect(dx-1,H-top-dh-1,dw+2,dh+2,stroke=1,fill=0)
    c.drawImage(str(p),dx,H-top-dh,dw,dh,mask='auto')
    if caption: para(caption,x,top+dh+7,w,8,11,MUTED)
    return top+dh

def chrome(number,chapter,title,intro=''):
    c.bookmarkPage(f'p{number}');c.addOutlineEntry(title,f'p{number}',level=0,closed=False)
    c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0)
    c.drawImage(str(SCREENS/'logo.png'),42,H-47,94,23,mask='auto')
    text(chapter.upper(),W-330,29,9,MUTED)
    text(title,42,71,25,'#000000',True)
    para(intro,42,112,W-84,11,16,MUTED)
    text('Đồng Quỹ  |  Hướng dẫn sử dụng  |  Phiên bản 1.0',42,H-29,8,MUTED)
    c.setFont('Be',8);c.setFillColor(HexColor(MUTED));c.drawRightString(W-42,21,f'{number:02d} / {TOTAL:02d}')
    if number>2:
        c.linkAbsolute('Về mục lục','p2',(42,15,285,33),thickness=0)

def end(number,title,bottom=0):
    if bottom>H-48: raise ValueError(f'Overflow page {number}: {bottom}')
    layout.append({'page':number,'title':title,'textBottom':round(bottom,2)})
    c.showPage()

# Cover
c.bookmarkPage('p1');c.addOutlineEntry('Hướng dẫn sử dụng Đồng Quỹ','p1',0)
c.setFillColor(white);c.rect(0,0,W,H,fill=1,stroke=0)
c.drawImage(str(SCREENS/'logo.png'),46,H-82,170,42,mask='auto')
text('TÀI LIỆU SẢN PHẨM',48,127,10,GREEN,True)
para('Hướng dẫn sử dụng<br/>Đồng Quỹ',46,158,490,39,49,'#000000',True)
para('Từ tạo nhóm đến ghi sổ và công khai quỹ',48,272,450,16,23,MUTED)
para('Dành cho chủ nhóm, người quản lý, thủ quỹ,<br/>người duyệt và thành viên.',48,325,435,11,17)
para('Thực hiện đúng quy trình thu chi, theo dõi đóng góp<br/>và chia sẻ thông tin quỹ theo quyền được cấp.',48,382,425,11,17)
text('PHIÊN BẢN 1.0  ·  THÁNG 11/2026',48,507,10,GREEN,True)
text('Ảnh chụp demo thực tế  |  Dữ liệu minh họa',48,533,9,MUTED)
c.drawImage(str(ASSETS/'brand-ribbon.png'),W-270,0,270,H,mask='auto')
photo('dashboard-mobile',W-244,83,198,428)
end(1,'Hướng dẫn sử dụng Đồng Quỹ')

# Contents
chrome(2,'Tra cứu nhanh','Bắt đầu với tài liệu này','Bạn có thể đọc theo thứ tự hoặc bấm vào một mục để đến đúng trang. Tên nút trong hướng dẫn khớp với giao diện demo hiện tại.')
toc=[(3,'Vai trò và quyền thao tác')]+[(i+4,p['title']) for i,p in enumerate(pages)]+[(TOTAL,'Xử lý tình huống và kiểm tra cuối kỳ')]
for i,(num,title) in enumerate(toc):
    col=0 if i<12 else 1;row=i if i<12 else i-12;x=42+col*390;y=175+row*25
    text(f'{num:02d}',x,y,10,GREEN,True);text(title,x+32,y,10.1,TEXT)
    c.linkAbsolute(title,f'p{num}',(x,H-y-18,x+365,H-y+2),thickness=0)
para('<b>Trước khi bắt đầu</b>  Chuẩn bị tài khoản riêng, đúng vai trò, nhóm và quỹ cần quản lý. Các ảnh có dữ liệu demo; thao tác tài chính thật cần chứng từ và quyền phù hợp.',42,505,W-84,10,15)
end(2,'Mục lục',535)

# Roles
chrome(3,'Phân quyền','Vai trò và quyền thao tác','Mỗi người có thể có nhiều vai trò. Quyền của một nhóm không tự áp dụng cho nhóm khác.')
rows=[['Vai trò','Công việc chính','Điểm cần nhớ'],['Chủ nhóm','Tạo và cấu hình quỹ; quản lý thành viên, vai trò và hạn mức; thực hiện nghiệp vụ tài chính.','Không tự duyệt giao dịch của mình nếu quỹ yêu cầu kiểm soát hai người.'],['Quản lý quỹ','Quản lý quỹ, danh mục, kỳ đóng, hoạt động; tạo và ghi sổ giao dịch.','Không tự có quyền Người duyệt nếu chưa được cấp vai trò đó.'],['Thủ quỹ','Ghi nhận thu chi, tải chứng từ, gửi duyệt, ghi sổ, phân bổ và đối soát.','Phê duyệt cần vai trò Chủ nhóm hoặc Người duyệt.'],['Người duyệt','Kiểm tra, phê duyệt hoặc từ chối giao dịch theo hạn mức.','Phải kiểm tra nội dung và bằng chứng trước khi duyệt.'],['Thành viên','Xem dữ liệu được cấp, nghĩa vụ của mình và chọn tên công khai hoặc ẩn danh.','Không mặc nhiên có quyền tạo hay sửa giao dịch.'],['Người xem công khai','Xem trang, giao dịch, báo cáo và chứng từ được phép công khai.','Không cần đăng nhập với quỹ Public hoặc Unlisted.'],['Quản trị nền tảng','Quản trị tài khoản và trạng thái kỹ thuật của nền tảng.','Không mặc nhiên có quyền tài chính của mọi nhóm.']]
sty=ParagraphStyle('cell',fontName='Be',fontSize=9.4,leading=14,textColor=HexColor(TEXT))
table=Table([[Paragraph(cell,ParagraphStyle('head',parent=sty,textColor=white,fontName='BeBold')) if r==0 else Paragraph(cell,sty) for cell in row] for r,row in enumerate(rows)],colWidths=[116,330,W-84-446])
table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),HexColor(NAVY)),('ROWBACKGROUNDS',(0,1),(-1,-1),[white,HexColor('#F6F8FA')]),('GRID',(0,0),(-1,-1),.5,HexColor('#D9D9D9')),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('VALIGN',(0,0),(-1,-1),'MIDDLE')]))
_,th=table.wrap(W-84,500);table.drawOn(c,42,H-162-th)
end(3,'Vai trò và quyền thao tác',162+th)

for i,p in enumerate(pages):
    num=i+4
    chrome(num,p['chapter'],p['title'],p['intro'])
    if p.get('layout')=='form':
        photo(p['image'],45,165,352,367,p['caption'])
        tx,tw=430,W-472
    elif p.get('layout')=='mobile':
        photo(p['image'],45,166,166,359)
        photo(p['image2'],223,166,166,359)
        tx,tw=423,W-465
    else:
        photo(p['image'],42,166,475,346,p['caption'])
        tx,tw=546,W-588
    y=167
    for n,(title,body) in enumerate(p['steps'],1):
        y=para(f'{n:02d}  {title}',tx,y,tw,10.7,15,TEXT,True)+5
        y=para(body,tx,y,tw,10.3,14.6)+11
    y+=1
    y=para('<b>Lưu ý</b>  '+p['note'],tx,y,tw,9.4,13.6,MUTED)
    end(num,p['title'],y)

# Troubleshooting and routine checklist
chrome(TOTAL,'Tra cứu nhanh','Xử lý tình huống và kiểm tra cuối kỳ','Khi gặp thông báo lỗi, đọc lý do cụ thể trước khi thử lại. Các kiểm tra dưới đây giúp xác định bước còn thiếu.')
left=[('Không thấy nhóm hoặc quỹ','Kiểm tra tài khoản đang đăng nhập, nhóm đang chọn và trạng thái thành viên. Nhờ chủ nhóm kiểm tra lời mời hoặc quyền được cấp.'),('Không được tự duyệt','Dùng tài khoản người duyệt khác nếu quỹ bật kiểm soát hai người. Kiểm tra hạn mức duyệt và vai trò của người xử lý.'),('Không thể ghi sổ','Giao dịch phải ở trạng thái Đã phê duyệt, quỹ còn hoạt động và đủ số dư. Số dư đầu kỳ cần chứng từ khi gửi duyệt.'),('Đóng góp chưa cập nhật','Kiểm tra khoản thu đã ghi sổ và đã phân bổ đúng người, đúng kỳ. Việc tạo yêu cầu qua QR chưa phải tiền đã nhận.')]
right=[('Người ngoài không thấy giao dịch','Kiểm tra quyền quỹ, trạng thái Đã ghi sổ, cờ công khai và nội dung công khai riêng của giao dịch.'),('Không xuất hoặc nhập được tệp','Kiểm tra loại tệp, dung lượng, số dòng và quyền. Báo cáo quá dài cần thu hẹp khoảng ngày.'),('Trước khi chốt kỳ','Đối chiếu số dư và sao kê; xử lý hàng chờ duyệt; kiểm tra chứng từ, phân bổ và miễn giảm; xuất báo cáo theo quyền.'),('Trước khi chia sẻ ra ngoài','Xem thử bằng cửa sổ không đăng nhập, rà soát tên và nội dung, kiểm tra chứng từ đã che dữ liệu riêng, rồi mới chia sẻ link.')]
bottom=0
for x,items in [(42,left),(438,right)]:
    y=164
    for title,body in items:
        y=para(title,x,y,355,11,15,TEXT,True)+5
        y=para(body,x,y,355,10.3,14.7)+16
    bottom=max(bottom,y)
end(TOTAL,'Xử lý tình huống và kiểm tra cuối kỳ',bottom)
c.save()
(ROOT/'tmp/pdfs/layout-audit.json').write_text(json.dumps({'pages':TOTAL,'layout':layout},ensure_ascii=False,indent=2),encoding='utf8')
print(f'PDF: {OUT} | pages={TOTAL}')
