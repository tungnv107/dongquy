import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const out='output/marketing/screens';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:2,locale:'vi-VN'});
const page=await context.newPage();
const base='http://localhost:3139';
const log=[];
page.on('pageerror',e=>log.push(e.message));
async function ready(){await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);}
async function shot(name,selector=null,full=false){await ready();await page.waitForFunction(()=>![...document.querySelectorAll('[role=dialog] .loading-state')].some(e=>e.offsetHeight));await page.waitForTimeout(300); const loc=selector?page.locator(selector):page;await loc.screenshot({path:`${out}/${name}.png`,...(selector?{}:{fullPage:full}),animations:'disabled'});console.log('CAPTURE',name);}
async function route(path){await page.goto(base+path);await ready();}
async function close(){await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click();}
await route('/'); await shot('home');
await page.locator('.brand').first().screenshot({path:`${out}/logo.png`,omitBackground:true});
await route('/funds/quy-song-xanh'); await shot('public');
await page.getByRole('button',{name:'Chia sẻ',exact:true}).click();await shot('share','[role=dialog]');await close();
await route('/funds/quy-song-xanh/transactions');await shot('public-transactions');
await route('/login'); await shot('login');
const accounts=JSON.parse(await fs.readFile('data/dev-accounts.json','utf8'));
await page.getByLabel('Địa chỉ email').fill(accounts.owner);await page.getByLabel('Mật khẩu',{exact:true}).fill(accounts.password);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/dashboard');await page.locator('.stat-balance').waitFor();
await shot('dashboard');
await page.locator('.charts-grid').screenshot({path:`${out}/charts.png`,animations:'disabled'});
await route('/dashboard/groups'); await shot('groups');
await page.getByRole('button',{name:'Tạo nhóm',exact:true}).click();
await page.getByLabel('Tên nhóm',{exact:false}).fill('Nhóm của chúng ta');await page.getByLabel('Đường dẫn nhóm').fill('nhom-cua-chung-ta');await page.getByLabel('Giới thiệu nhóm').fill('Cùng đóng góp, cùng quản lý minh bạch.');await shot('group-form','[role=dialog]');await close();
await route('/dashboard/funds');await shot('funds');
await page.getByRole('button',{name:'Tạo quỹ',exact:true}).click();await page.getByLabel('Tên quỹ',{exact:false}).fill('Quỹ hoạt động chung');await page.getByLabel('Đường dẫn công khai').fill('quy-hoat-dong-chung');await shot('fund-form','[role=dialog]');await close();
await route('/dashboard/members');await shot('members');
await page.getByRole('button',{name:'Thêm thành viên',exact:true}).click();await page.getByLabel('Email thành viên').fill('thanhvien@example.com');await page.getByRole('checkbox',{name:'Người duyệt',exact:true}).check();await shot('member-form','[role=dialog]');await close();
await route('/dashboard/transactions');await shot('transactions');
await page.getByRole('button',{name:'Thêm giao dịch',exact:true}).click();
await page.getByLabel('Số tiền (VND)',{exact:false}).fill('500000');await page.getByLabel('Nội dung nội bộ').fill('Đóng quỹ hoạt động tháng 11');await page.getByLabel('Nội dung được phép công khai').fill('Đóng góp quỹ hoạt động tháng 11');await page.getByRole('checkbox',{name:'Cho phép công khai giao dịch sau khi ghi sổ'}).check();await shot('income-form','[role=dialog]');
await page.getByRole('dialog').getByRole('button',{name:'Khoản chi',exact:true}).click();await page.getByLabel('Số tiền (VND)',{exact:false}).fill('120000');await page.getByLabel('Nội dung nội bộ').fill('Mua nước uống cho buổi sinh hoạt');await page.getByLabel('Người nhận tiền (nội bộ)').fill('Người nhận minh họa');await shot('expense-form','[role=dialog]');
await page.getByRole('dialog').getByRole('button',{name:'Chuyển quỹ',exact:true}).click();await page.getByLabel('Số tiền (VND)',{exact:false}).fill('2000000');await page.getByLabel('Nội dung nội bộ').fill('Chuyển sang quỹ dự phòng');await page.getByLabel('Quỹ nhận').selectOption({label:'Quỹ dự phòng'}).catch(()=>{});await shot('transfer-form','[role=dialog]');await close();
await route('/dashboard/approvals');await shot('approvals');await page.locator('.transaction-name').first().click();await shot('approval-detail','[role=dialog]');await close();
await route('/dashboard/transactions');await page.getByLabel('Trạng thái giao dịch').selectOption('POSTED');await ready();await page.locator('.transaction-name').first().click();await shot('posted-detail','[role=dialog]');await close();
await route('/dashboard/contributions');await shot('contributions');await page.locator('.period-card').first().click();await shot('period-detail','[role=dialog]');await close();
await route('/dashboard/reconciliation');await shot('reconciliation');
await route('/dashboard/reports');await shot('reports');
await route('/dashboard/documents');await shot('documents');
await route('/dashboard/settings');await page.getByRole('button',{name:'Công khai & riêng tư',exact:true}).click();await shot('privacy');await page.getByRole('button',{name:'Tài khoản nhận tiền',exact:true}).click();await shot('bank-settings');await page.getByRole('button',{name:'Hồ sơ của tôi',exact:true}).click();await shot('profile-settings');
await route('/dashboard/activities');await shot('activities');await route('/dashboard/audit-logs');await shot('audit');
await page.setViewportSize({width:390,height:844});await route('/funds/quy-song-xanh');await shot('public-mobile');
await route('/dashboard');await page.locator('.stat-balance').waitFor();await shot('dashboard-mobile');await page.getByRole('button',{name:'Chuyển sang giao diện tối'}).click();await shot('dashboard-dark-mobile');
await fs.writeFile(`${out}/capture-log.json`,JSON.stringify({capturedAt:new Date().toISOString(),base,errors:log},null,2));
await browser.close();if(log.length)process.exitCode=1;
